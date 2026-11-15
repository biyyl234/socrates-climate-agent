/**
 * Unified LLM adapter contract (report §2.2, §4). Providers DeepSeek / OpenAI /
 * Volcano Ark all expose an OpenAI-compatible chat-completion endpoint; the
 * adapter hides that wire format behind this interface.
 */

import type { JsonSchema } from "../../tools/schemas";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  /** Parsed JSON arguments; the LLM only declares the call, execution is deterministic on the backend. */
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
}

export interface LlmToolSpec {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export interface CompletionOptions {
  messages: ChatMessage[];
  tools?: LlmToolSpec[];
  /** Controls whether the model must emit a tool call (OpenAI tool_choice). Defaults to "auto". */
  toolChoice?: "auto" | "required" | "none";
  /** Abort the in-flight request. */
  signal?: AbortSignal;
  /** Wall-clock timeout in ms; defaults come from the adapter config. */
  timeoutMs?: number;
  /** Streaming token hook: each natural-language delta is forwarded here. */
  onToken?: (delta: string) => void;
  maxTokens?: number;
  temperature?: number;
}

export type CompletionFinishReason = "stop" | "tool_calls" | "length" | "error";

export interface CompletionUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface CompletionResult {
  content: string;
  toolCalls: ToolCall[];
  finishReason: CompletionFinishReason;
  usage?: CompletionUsage;
  /** Raw provider payload for debugging / edge-function passthrough. */
  raw?: unknown;
}

export interface LlmAdapter {
  readonly provider: string;
  complete(options: CompletionOptions): Promise<CompletionResult>;
}
