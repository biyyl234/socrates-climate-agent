/**
 * GET /models — server-side proxy for the LLM gateway's model list.
 *
 * The gateway API key stays on the server; only model ids/owners and the
 * default model are returned. The settings page uses this to populate the
 * model picker without ever touching the secret.
 */

import {
  listProviderModels,
  loadActiveProfile,
  LlmError,
} from "@socrates/core";
import { envObject, jsonResponse, preflightResponse } from "../shared/http";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "GET") {
    return jsonResponse(
      { error: { code: "INVALID_PAYLOAD", message: "Method not allowed; use GET" } },
      400,
    );
  }

  const env = envObject();
  const profile = loadActiveProfile(env);
  if (!profile) {
    return jsonResponse(
      { error: { code: "LLM_UNAVAILABLE", message: "未配置 LLM 供应商凭证（LLM_BASE_URL / LLM_API_KEY）。" } },
      503,
    );
  }

  try {
    const models = await listProviderModels(profile);
    return jsonResponse(
      {
        models,
        default_model: profile.defaultModel,
        profile_id: profile.id,
        base_url: profile.baseUrl,
      },
      200,
    );
  } catch (error) {
    const code =
      error instanceof LlmError
        ? error.kind === "auth"
          ? "UPSTREAM_ERROR"
          : error.kind === "rate_limit"
            ? "RATE_LIMITED"
            : "UPSTREAM_ERROR"
        : "INTERNAL";
    const message = error instanceof Error ? error.message : "failed to list models";
    return jsonResponse({ error: { code, message } }, code === "RATE_LIMITED" ? 429 : 502);
  }
});
