/**
 * Inbound /chat payload validation (report §3.4). New module alongside the
 * frozen SSE contract; maps invalid payloads to INVALID_PAYLOAD without
 * touching the LLM.
 */

import type { ChatErrorCode, ChatRequest } from "./sse-events";

export interface RequestIssue {
  field: string;
  reason: string;
}

export interface RequestValidationResult {
  ok: boolean;
  issues: RequestIssue[];
  error?: ChatErrorCode;
}

const MODES = new Set(["assisted", "demo"]);

export function validateChatRequest(raw: unknown): RequestValidationResult {
  const issues: RequestIssue[] = [];

  if (typeof raw !== "object" || raw === null) {
    return {
      ok: false,
      issues: [{ field: "body", reason: "request body must be a JSON object" }],
      error: "INVALID_PAYLOAD",
    };
  }

  const body = raw as Partial<ChatRequest>;

  if (typeof body.message !== "string" || body.message.length === 0) {
    issues.push({ field: "message", reason: "message is required" });
  } else if (body.message.length > 1000) {
    issues.push({ field: "message", reason: "message exceeds 1000 characters" });
  }

  if (body.locale !== undefined && typeof body.locale !== "string") {
    issues.push({ field: "locale", reason: "locale must be a string" });
  }

  if (body.mode !== undefined && !MODES.has(body.mode)) {
    issues.push({ field: "mode", reason: "mode must be 'assisted' or 'demo'" });
  }

  if (body.context !== undefined && typeof body.context !== "object") {
    issues.push({ field: "context", reason: "context must be an object" });
  }

  return {
    ok: issues.length === 0,
    issues,
    error: issues.length > 0 ? "INVALID_PAYLOAD" : undefined,
  };
}
