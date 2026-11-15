/**
 * Provider profile abstraction for OpenAI-compatible LLM gateways.
 *
 * A profile bundles everything needed to talk to one gateway — base URL,
 * API key and the default model — so the whole provider can be swapped by
 * configuration without touching the UI or conversation logic. The API key
 * lives only on the server (Edge Function env / secrets); this module never
 * exposes it to clients.
 *
 * Multi-provider support is achieved by defining several profiles and
 * selecting the active one; listProviderModels proxies the gateway's
 * GET /models endpoint server-side so the key is never sent to the client.
 */

import { LlmError } from "./errors";
import { OpenAICompatibleLlm } from "./openai-compatible";
import type { LlmAdapter } from "./types";

export interface ProviderProfile {
  /** Stable identifier for the profile (e.g. "openai-next"). */
  id: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

export interface ModelInfo {
  id: string;
  owned_by?: string;
}

type EnvSource = Record<string, string | undefined>;

/**
 * Build the active provider profile from environment configuration.
 * Returns null when no key/base URL is configured so callers fall back to
 * the offline Mock adapter rather than fabricating a connection.
 */
export function loadActiveProfile(env: EnvSource = process.env): ProviderProfile | null {
  const baseUrl = (env.LLM_BASE_URL ?? "").trim();
  const apiKey = (env.LLM_API_KEY ?? "").trim();
  if (!baseUrl || !apiKey) return null;
  const id = (env.LLM_PROVIDER ?? "openai-compatible").trim() || "openai-compatible";
  const defaultModel = (env.LLM_MODEL ?? "").trim();
  return { id, baseUrl, apiKey, defaultModel };
}

/**
 * Create a chat adapter for a profile, optionally overriding the model
 * (e.g. from the user's settings selection). The model name is not a secret.
 */
export function createAdapterForProfile(
  profile: ProviderProfile,
  modelOverride?: string,
): LlmAdapter {
  const model = (modelOverride ?? profile.defaultModel).trim();
  if (!model) {
    throw new LlmError(
      "invalid_response",
      "No model selected: the profile has no default model and no override was supplied.",
    );
  }
  return new OpenAICompatibleLlm({
    provider: profile.id,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model,
  });
}

/**
 * Server-side proxy for the gateway's model list. The API key is attached here
 * and stripped from the response; only model ids/owners are returned.
 */
export async function listProviderModels(
  profile: ProviderProfile,
  fetchImpl: typeof fetch = fetch,
): Promise<ModelInfo[]> {
  const endpoint = `${profile.baseUrl.replace(/\/$/, "")}/models`;
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${profile.apiKey}`,
      },
    });
  } catch (cause) {
    throw new LlmError(
      "unavailable",
      cause instanceof Error ? `Model list request failed: ${cause.message}` : "Model list request failed",
      undefined,
      cause,
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new LlmError("auth", `Gateway rejected credentials while listing models (HTTP ${response.status})`, response.status);
    }
    if (response.status === 429) {
      throw new LlmError("rate_limit", "Gateway rate limited the model list request", response.status);
    }
    throw new LlmError("upstream", `Model list request failed (HTTP ${response.status})`, response.status);
  }

  const payload = (await response.json()) as { data?: Array<{ id?: string; owned_by?: string }> };
  const rows = Array.isArray(payload.data) ? payload.data : [];
  return rows
    .filter((row) => typeof row.id === "string" && row.id.length > 0)
    .map((row) => ({ id: row.id!, owned_by: typeof row.owned_by === "string" ? row.owned_by : undefined }));
}
