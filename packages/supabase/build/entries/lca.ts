/**
 * POST /lca — deterministic attributional LCA calculation (report §3.6).
 *
 * The engine is reused from @socrates/data: point value, interval envelope,
 * phases, factor citations and DQ grades are produced there. This function
 * only validates the request, maps the §3.2 error codes and returns the card.
 */

import { calculateFootprint, type CategoryId } from "@socrates/data";
import {
  CORS_HEADERS,
  errorResponse,
  preflightResponse,
  readJsonBody,
} from "../shared/http";

const UNITS = new Set(["meal", "bottle", "can", "pack", "item", "g", "ml"]);

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
    category_id?: string;
    attributes?: Record<string, unknown>;
    quantity?: number;
    unit?: string;
    baseline?: unknown;
  };

  const issues: Array<{ field: string; reason: string }> = [];
  if (typeof raw.category_id !== "string" || raw.category_id.trim().length === 0) {
    issues.push({ field: "category_id", reason: "category_id is required" });
  }
  if (raw.attributes !== undefined && (typeof raw.attributes !== "object" || raw.attributes === null)) {
    issues.push({ field: "attributes", reason: "attributes must be an object" });
  }
  if (typeof raw.quantity !== "number" || !Number.isFinite(raw.quantity) || raw.quantity < 0) {
    issues.push({ field: "quantity", reason: "quantity must be a non-negative number" });
  }
  if (typeof raw.unit !== "string" || !UNITS.has(raw.unit)) {
    issues.push({ field: "unit", reason: `unit must be one of ${[...UNITS].join(", ")}` });
  }
  if (issues.length > 0) return errorResponse("INVALID_PAYLOAD", "请求字段不满足 schema", issues);

  const outcome = calculateFootprint({
    category_id: raw.category_id as CategoryId,
    attributes: raw.attributes ?? {},
    quantity: raw.quantity as number,
    unit: raw.unit as "meal" | "bottle" | "can" | "pack" | "item" | "g" | "ml",
  });

  if (!outcome.ok) {
    const code = outcome.error.code;
    return errorResponse(code, outcome.error.message, outcome.error.missing.map((m) => ({ field: "category_id", reason: m })));
  }

  return new Response(JSON.stringify(outcome.result), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
});
