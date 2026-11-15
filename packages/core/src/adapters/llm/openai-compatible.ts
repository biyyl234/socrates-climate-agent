/**
 * OpenAI-compatible HTTP adapter. Works with DeepSeek, OpenAI and Volcano Ark
 * because they share the `/chat/completions` wire format. Base URL, API key and
 * model are injected (or read from environment by the factory) — no secret is
 * hard-coded here.
 */

import { LlmError } from "./errors";
import type {
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  LlmAdapter,
  LlmToolSpec,
  ToolCall,
} from "./types";

export interface OpenAICompatibleConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
  /** Injectable fetch (tests / edge runtimes). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 8000; // report §6.3: first-token budget 8s
const DEFAULT_MAX_RETRIES = 2;

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIChoice {
  message?: {
    role?: string;
    content?: string | null;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason?: string | null;
}

function normalizeMessages(messages: ChatMessage[]) {
  return messages.map((msg) => {
    const base: Record<string, unknown> = { role: msg.role, content: msg.content };
    if (msg.name !== undefined) base.name = msg.name;
    if (msg.tool_call_id !== undefined) base.tool_call_id = msg.tool_call_id;
    if (msg.tool_calls) {
      base.tool_calls = msg.tool_calls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.arguments) },
      }));
    }
    return base;
  });
}

function toOpenAiTools(tools: LlmToolSpec[]) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

export class OpenAICompatibleLlm implements LlmAdapter {
  readonly provider: string;
  private readonly config: OpenAICompatibleConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: OpenAICompatibleConfig) {
    this.assertConfigured(config);
    this.provider = config.provider;
    this.config = config;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private assertConfigured(config: OpenAICompatibleConfig): void {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new LlmError(
        "missing_credentials",
        `LLM provider "${config.provider}" has no API key; set LLM_API_KEY or inject a key.`,
      );
    }
    if (!config.baseUrl || config.baseUrl.trim().length === 0) {
      throw new LlmError(
        "missing_credentials",
        `LLM provider "${config.provider}" has no base URL; set LLM_BASE_URL.`,
      );
    }
    if (!config.model || config.model.trim().length === 0) {
      throw new LlmError(
        "missing_credentials",
        `LLM provider "${config.provider}" has no model; set LLM_MODEL.`,
      );
    }
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    this.assertConfigured({ ...this.config, provider: this.provider });

    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = this.config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const endpoint = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: normalizeMessages(options.messages),
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      stream: false,
    };
    if (options.tools && options.tools.length > 0) {
      body.tools = toOpenAiTools(options.tools);
      body.tool_choice = options.toolChoice ?? "auto";
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const onOuterAbort = () => controller.abort(options.signal?.reason);
      options.signal?.addEventListener("abort", onOuterAbort);

      try {
        const response = await this.fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 401 || status === 403) {
            throw new LlmError("auth", `LLM rejected credentials (HTTP ${status})`, status);
          }
          if (status === 429) {
            throw new LlmError("rate_limit", `LLM rate limited (HTTP ${status})`, status);
          }
          if (status >= 500 && attempt < maxRetries) {
            lastError = new LlmError("upstream", `LLM upstream error (HTTP ${status})`, status);
            await sleep(300 * 2 ** attempt, options.signal);
            continue;
          }
          throw new LlmError(
            status >= 500 ? "unavailable" : "upstream",
            `LLM request failed (HTTP ${status})`,
            status,
          );
        }

        const payload = (await response.json()) as {
          choices?: OpenAIChoice[];
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };
        const choice = payload.choices?.[0];
        if (!choice?.message) {
          throw new LlmError("invalid_response", "LLM response has no choices[0].message");
        }

        const content = choice.message.content ?? "";
        const toolCalls = this.parseToolCalls(choice.message.tool_calls);
        options.onToken?.(content);

        return {
          content,
          toolCalls,
          finishReason:
            toolCalls.length > 0
              ? "tool_calls"
              : choice.finish_reason === "length"
                ? "length"
                : "stop",
          usage: payload.usage
            ? {
                promptTokens: payload.usage.prompt_tokens,
                completionTokens: payload.usage.completion_tokens,
                totalTokens: payload.usage.total_tokens,
              }
            : undefined,
          raw: payload,
        };
      } catch (error) {
        if (error instanceof LlmError) throw error;
        if (error instanceof DOMException && error.name === "AbortError") {
          const timedOut = !options.signal?.aborted;
          throw new LlmError(
            timedOut ? "timeout" : "unavailable",
            timedOut ? `LLM request timed out after ${timeoutMs}ms` : "LLM request aborted",
            undefined,
            error,
          );
        }
        lastError = error;
        if (attempt < maxRetries) {
          await sleep(300 * 2 ** attempt, options.signal).catch(() => undefined);
          continue;
        }
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", onOuterAbort);
      }
    }

    throw lastError instanceof LlmError
      ? lastError
      : new LlmError("upstream", "LLM request failed after retries", undefined, lastError);
  }

  private parseToolCalls(raw: OpenAIToolCall[] | undefined): ToolCall[] {
    if (!raw) return [];
    return raw.map((call, index) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(call.function.arguments) as Record<string, unknown>;
      } catch (error) {
        throw new LlmError(
          "invalid_response",
          `Tool call ${index} has non-JSON arguments`,
          undefined,
          error,
        );
      }
      return { id: call.id, name: call.function.name, arguments: parsed };
    });
  }
}
