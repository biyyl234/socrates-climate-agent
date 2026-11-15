/**
 * POST /commitment — record a voluntary commitment (report §3.9).
 *
 * Topic/wording length validation uses the shared tool contract where possible;
 * the row is written server-side with the injected service role. When privacy
 * consent is not recorded the row is kept locally with consent_recorded=false
 * and is not reported to any pilot-study dataset.
 */

import {
  CORS_HEADERS,
  envObject,
  errorResponse,
  preflightResponse,
  readJsonBody,
} from "../shared/http";
import { restInsert, RestError } from "../shared/rest";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") {
    return errorResponse("INVALID_PAYLOAD", "Method not allowed; use POST", [
      { field: "method", reason: "expected POST" },
    ]);
  }

  const body = await readJsonBody(request);
  if (!body.ok) return errorResponse("INVALID_PAYLOAD", "请求体不满足 schema", body.issues);

  const raw = body.value as {
    session_id?: string;
    commitment_text?: string;
    category_id?: string | null;
    alternative?: string;
    barrier?: string | null;
    plan?: string | null;
    self_efficacy?: number | null;
    follow_up_days?: number;
    consent?: boolean;
  };

  const issues: Array<{ field: string; reason: string }> = [];
  const commitmentText = typeof raw.commitment_text === "string" ? raw.commitment_text.trim() : "";
  if (commitmentText.length === 0) issues.push({ field: "commitment_text", reason: "commitment_text is required" });
  else if (commitmentText.length > 300) issues.push({ field: "commitment_text", reason: "commitment_text exceeds 300 characters" });

  if (typeof raw.alternative !== "string" || raw.alternative.trim().length === 0) {
    issues.push({ field: "alternative", reason: "alternative is required" });
  }
  if (raw.barrier !== undefined && raw.barrier !== null && typeof raw.barrier !== "string") {
    issues.push({ field: "barrier", reason: "barrier must be a string or null" });
  }
  if (raw.plan !== undefined && raw.plan !== null && typeof raw.plan !== "string") {
    issues.push({ field: "plan", reason: "plan must be a string or null" });
  }
  if (raw.self_efficacy !== undefined && raw.self_efficacy !== null) {
    if (
      typeof raw.self_efficacy !== "number" ||
      !Number.isInteger(raw.self_efficacy) ||
      raw.self_efficacy < 1 ||
      raw.self_efficacy > 5
    ) {
      issues.push({ field: "self_efficacy", reason: "self_efficacy must be an integer 1–5" });
    }
  }
  const followUpDays = typeof raw.follow_up_days === "number" ? raw.follow_up_days : 7;
  if (!Number.isInteger(followUpDays) || followUpDays < 1 || followUpDays > 90) {
    issues.push({ field: "follow_up_days", reason: "follow_up_days must be an integer 1–90" });
  }
  if (issues.length > 0) return errorResponse("INVALID_PAYLOAD", "请求字段不满足 schema", issues);

  const consent = raw.consent === true;
  const created = new Date();
  const due = new Date(created.getTime() + followUpDays * 24 * 60 * 60 * 1000);
  const sessionId =
    typeof raw.session_id === "string" && raw.session_id.trim().length > 0
      ? raw.session_id
      : `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const env = envObject();
  try {
    const row = await restInsert<{ id: string }>(env, "commitments", {
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
      consent_recorded: consent,
    });

    return new Response(
      JSON.stringify({
        commitment_id: row.id,
        created_at: created.toISOString(),
        follow_up_due: due.toISOString(),
        status: "active",
        consent_recorded: consent,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } },
    );
  } catch (error) {
    if (error instanceof RestError) {
      return errorResponse("UPSTREAM_ERROR", error.message);
    }
    const message = error instanceof Error ? error.message : "internal error";
    return errorResponse("INTERNAL", message);
  }
});
