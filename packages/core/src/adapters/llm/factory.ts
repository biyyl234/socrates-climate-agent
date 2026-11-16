/**
 * LLM adapter factory. Selection and credentials come from injected config or
 * environment variables; nothing here reads a secret from source code.
 *
 * Switching between offline demo and a real provider:
 * - demo: no key required — provider resolves to `mock` when LLM_PROVIDER is empty.
 * - real: set LLM_PROVIDER=deepseek|openai|ark, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL,
 *   or pass the same values explicitly to `createLlmAdapter`.
 */

import { MockLlm } from "./mock";
import { OpenAICompatibleLlm } from "./openai-compatible";
import type { LlmAdapter } from "./types";

export interface LlmFactoryConfig {
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

type EnvSource = Record<string, string | undefined>;

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

const PROVIDER_DEFAULTS: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com/v1",
  ark: "https://ark.cn-beijing.volces.com/api/v3",
  volcano: "https://ark.cn-beijing.volces.com/api/v3",
  volcanoark: "https://ark.cn-beijing.volces.com/api/v3",
};

export function createLlmAdapter(
  config: LlmFactoryConfig = {},
  env: EnvSource = process.env,
): LlmAdapter {
  const provider = (config.provider ?? env.LLM_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "mock" || provider === "") {
    return new MockLlm();
  }

  const baseUrl =
    config.baseUrl ?? env.LLM_BASE_URL ?? PROVIDER_DEFAULTS[provider] ?? "";
  const apiKey = config.apiKey ?? env.LLM_API_KEY ?? "";
  const model = config.model ?? env.LLM_MODEL ?? "";

  return new OpenAICompatibleLlm({
    provider,
    baseUrl,
    apiKey,
    model,
    timeoutMs: config.timeoutMs ?? parsePositiveInt(env.LLM_TIMEOUT_MS),
    maxRetries: config.maxRetries ?? parsePositiveInt(env.LLM_MAX_RETRIES),
  });
}
