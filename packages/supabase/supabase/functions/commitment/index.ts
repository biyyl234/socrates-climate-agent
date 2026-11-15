// build/shared/http.ts
var ERROR_STATUS = {
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
  INTERNAL: 500
};
function statusForCode(code) {
  return ERROR_STATUS[code] ?? 500;
}
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
function preflightResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  });
}
function errorResponse(code, message, details = [], retryAfter = null) {
  const status = statusForCode(code);
  const body = { error: { code, message, details, retry_after: retryAfter } };
  return jsonResponse(body, status);
}
function envObject() {
  if (typeof Deno !== "undefined" && Deno.env && typeof Deno.env.toObject === "function") {
    return Deno.env.toObject();
  }
  return {};
}
async function readJsonBody(request) {
  const raw = await request.text();
  if (raw.trim().length === 0) {
    return { ok: false, value: null, issues: [{ field: "body", reason: "request body is empty" }] };
  }
  try {
    const value = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        ok: false,
        value,
        issues: [{ field: "body", reason: "request body must be a JSON object" }]
      };
    }
    return { ok: true, value, issues: [] };
  } catch {
    return { ok: false, value: null, issues: [{ field: "body", reason: "invalid JSON" }] };
  }
}

// build/shared/rest.ts
var RestError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "RestError";
  }
};
function requireConfigured(env) {
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new RestError(500, "INTERNAL", "Supabase environment is not configured");
  }
  return { url, key };
}
async function restInsert(env, table, record) {
  const { url, key } = requireConfigured(env);
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(record)
  });
  if (!response.ok) {
    throw new RestError(response.status, "UPSTREAM_ERROR", `REST insert ${table} failed (HTTP ${response.status})`);
  }
  const rows = await response.json();
  return rows[0];
}

// build/entries/commitment.ts
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") {
    return errorResponse("INVALID_PAYLOAD", "Method not allowed; use POST", [
      { field: "method", reason: "expected POST" }
    ]);
  }
  const body = await readJsonBody(request);
  if (!body.ok) return errorResponse("INVALID_PAYLOAD", "请求体不满足 schema", body.issues);
  const raw = body.value;
  const issues = [];
  const commitmentText = typeof raw.commitment_text === "string" ? raw.commitment_text.trim() : "";
  if (commitmentText.length === 0) issues.push({ field: "commitment_text", reason: "commitment_text is required" });
  else if (commitmentText.length > 300) issues.push({ field: "commitment_text", reason: "commitment_text exceeds 300 characters" });
  if (typeof raw.alternative !== "string" || raw.alternative.trim().length === 0) {
    issues.push({ field: "alternative", reason: "alternative is required" });
  }
  if (raw.barrier !== void 0 && raw.barrier !== null && typeof raw.barrier !== "string") {
    issues.push({ field: "barrier", reason: "barrier must be a string or null" });
  }
  if (raw.plan !== void 0 && raw.plan !== null && typeof raw.plan !== "string") {
    issues.push({ field: "plan", reason: "plan must be a string or null" });
  }
  if (raw.self_efficacy !== void 0 && raw.self_efficacy !== null) {
    if (typeof raw.self_efficacy !== "number" || !Number.isInteger(raw.self_efficacy) || raw.self_efficacy < 1 || raw.self_efficacy > 5) {
      issues.push({ field: "self_efficacy", reason: "self_efficacy must be an integer 1–5" });
    }
  }
  const followUpDays = typeof raw.follow_up_days === "number" ? raw.follow_up_days : 7;
  if (!Number.isInteger(followUpDays) || followUpDays < 1 || followUpDays > 90) {
    issues.push({ field: "follow_up_days", reason: "follow_up_days must be an integer 1–90" });
  }
  if (issues.length > 0) return errorResponse("INVALID_PAYLOAD", "请求字段不满足 schema", issues);
  const consent = raw.consent === true;
  const created = /* @__PURE__ */ new Date();
  const due = new Date(created.getTime() + followUpDays * 24 * 60 * 60 * 1e3);
  const sessionId = typeof raw.session_id === "string" && raw.session_id.trim().length > 0 ? raw.session_id : `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const env = envObject();
  try {
    const row = await restInsert(env, "commitments", {
      session_id: sessionId,
      profile_id: null,
      commitment_text: commitmentText,
      category_id: raw.category_id ?? null,
      alternative: raw.alternative,
      barrier: raw.barrier ?? null,
      plan: raw.plan ?? null,
      self_efficacy: raw.self_efficacy ?? null,
      follow_up_days: followUpDays,
      follow_up_due: due.toISOString(),
      status: "active",
      consent_recorded: consent
    });
    return new Response(
      JSON.stringify({
        commitment_id: row.id,
        created_at: created.toISOString(),
        follow_up_due: due.toISOString(),
        status: "active",
        consent_recorded: consent
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error) {
    if (error instanceof RestError) {
      return errorResponse("UPSTREAM_ERROR", error.message);
    }
    const message = error instanceof Error ? error.message : "internal error";
    return errorResponse("INTERNAL", message);
  }
});
