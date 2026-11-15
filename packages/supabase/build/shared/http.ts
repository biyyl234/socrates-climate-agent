/**
 * Edge-function HTTP glue: CORS, JSON envelopes and the §3.2 error map.
 *
 * This module holds only transport-layer concerns. Domain rules (guards,
 * validation, LCA engine) are reused from @socrates/core and @socrates/data;
 * they are never re-implemented here.
 */

export type Json = Record<string, unknown>;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: Array<{ field: string; reason: string }>;
    retry_after: number | null;
  };
}

/** §3.2 status mapping. Unknown codes fall back to 500 INTERNAL. */
const ERROR_STATUS: Record<string, number> = {
  INVALID_PAYLOAD: 400,
  SESSION_REQUIRED: 401,
  TOPIC_BLOCKED: 403,
  PRODUCT_NOT_FOUND: 404,
  FACTOR_NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  LLM_UNAVAILABLE: 503,
  SPEECH_UNAVAILABLE: 503,
  LCA_ENGINE_ERROR: 503,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500,
};

export function statusForCode(code: string): number {
  return ERROR_STATUS[code] ?? 500;
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-id, x-llm-model",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

export function errorResponse(
  code: string,
  message: string,
  details: Array<{ field: string; reason: string }> = [],
  retryAfter: number | null = null,
): Response {
  const status = statusForCode(code);
  const body: ApiErrorBody = { error: { code, message, details, retry_after: retryAfter } };
  return jsonResponse(body, status);
}

/** Read environment variables in the Deno edge runtime (or Node during build tests). */
export function envObject(): Record<string, string> {
  if (typeof Deno !== "undefined" && Deno.env && typeof Deno.env.toObject === "function") {
    return Deno.env.toObject();
  }
  return {};
}

export interface ParsedBody {
  ok: boolean;
  value: unknown;
  issues: Array<{ field: string; reason: string }>;
}

/** Parse a JSON request body; empty bodies and non-JSON become structured issues. */
export async function readJsonBody(request: Request): Promise<ParsedBody> {
  const raw = await request.text();
  if (raw.trim().length === 0) {
    return { ok: false, value: null, issues: [{ field: "body", reason: "request body is empty" }] };
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        ok: false,
        value,
        issues: [{ field: "body", reason: "request body must be a JSON object" }],
      };
    }
    return { ok: true, value, issues: [] };
  } catch {
    return { ok: false, value: null, issues: [{ field: "body", reason: "invalid JSON" }] };
  }
}
