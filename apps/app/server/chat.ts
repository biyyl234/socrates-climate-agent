/**
 * Vercel Node serverless handler for the Socrates chat turn.
 *
 * This is the web deployment's backend: it runs the same @socrates/core MI
 * orchestrator, guards and state machine as the Supabase Edge Function, with
 * the deterministic LCA tools bound to @socrates/data. Keeping the LLM gateway
 * key server-side (Vercel environment variables) means no secret reaches the
 * browser. The response is the frozen SSE wire format the app already parses.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createLlmAdapter,
  encodeSse,
  MiOrchestrator,
  type ChatMessage,
  type LlmAdapter,
  type OrchestratorContext,
  type OrchestratorSignals,
  type SseEvent,
  type ToolExecutionOutcome,
  type ToolExecutor,
} from "@socrates/core";
import {
  calculateFootprint,
  compareFootprints,
  getFactorsByCategory,
  isCategoryId,
  type CategoryId,
  type EmissionFactor,
  type FootprintRequest,
} from "@socrates/data";

type Args = Record<string, unknown>;

function asRecord(value: unknown): Args | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Args;
}

function unitForCategory(categoryId: string): FootprintRequest["unit"] {
  if (categoryId.startsWith("meal")) return "meal";
  if (categoryId === "bottled_water" || categoryId === "beverage") return "bottle";
  if (
    categoryId === "snack" ||
    categoryId === "snack_packaging" ||
    categoryId === "express_packaging"
  ) {
    return "pack";
  }
  return "item";
}

function toFactorRecord(f: EmissionFactor): Record<string, unknown> {
  return {
    factor_id: f.factor_id,
    stage: f.lifecycle_stage,
    activity: f.activity,
    activity_unit: f.activity_unit,
    factor_value: f.emission_factor_value,
    factor_unit: f.emission_factor_unit,
    interval_low: f.interval_low,
    interval_high: f.interval_high,
    gwp_version: f.gwp_version,
    geography: f.geography,
    temporal: f.temporal_validity,
    dq: f.dq,
    source_name: f.source_name,
    source_url: f.source_url,
    license: f.license,
    attribution: f.attribution,
    version: f.version,
    valid_from: f.valid_from,
    valid_to: f.valid_to,
    data_type: f.data_type,
  };
}

function ok(result: unknown, signals?: OrchestratorSignals): ToolExecutionOutcome {
  return { ok: true, result, signals };
}

function fail(error: string): ToolExecutionOutcome {
  return { ok: false, error: error as never };
}

/**
 * Deterministic tool executor. Mirrors the Edge Function executor; the only
 * difference is log_commitment: without a service-role key it returns a
 * best-effort synthetic record (the client also persists the commitment
 * locally), so the MI flow never hard-fails on a missing database.
 */
function createNodeExecutor(sessionId: string): ToolExecutor {
  return async function execute(tool, rawArgs): Promise<ToolExecutionOutcome> {
    const args = asRecord(rawArgs);
    if (!args) return fail("INVALID_PAYLOAD");

    switch (tool) {
      case "extract_product_attributes": {
        const freeText = typeof args.free_text === "string" ? args.free_text.trim() : "";
        if (freeText.length === 0) return fail("INVALID_PAYLOAD");
        return ok({
          product_name: freeText,
          brand: null,
          category_hint: "other",
          ingredients: [],
          package_format: "other",
          quantity_text: null,
          confidence: 0.4,
          missing_fields: ["brand", "ingredients", "package_format"],
        });
      }

      case "map_to_category": {
        const attributes = asRecord(args.attributes);
        if (!attributes) return fail("INVALID_PAYLOAD");
        const hint =
          typeof attributes.category_hint === "string" ? attributes.category_hint : "other";
        const categoryId = isCategoryId(hint) ? hint : "other";
        const confidence =
          typeof attributes.confidence === "number" ? attributes.confidence : 0.5;
        return ok(
          {
            category_id: categoryId,
            category_path: [categoryId],
            mapped: categoryId !== "other",
            match_confidence: confidence,
            alternatives: [],
            need_clarification: confidence < 0.6,
            clarification_question:
              confidence < 0.6 ? "方便补充一下产品名称、配料或包装规格吗？" : null,
          },
          { confidence, needClarification: confidence < 0.6 },
        );
      }

      case "get_emission_factors": {
        const categoryId = typeof args.category_id === "string" ? args.category_id : "";
        if (!isCategoryId(categoryId)) return fail("INVALID_PAYLOAD");
        const factors = getFactorsByCategory(categoryId as CategoryId).map(toFactorRecord);
        return ok({
          factors,
          selection_note: factors.length > 0 ? "本地因子库匹配结果" : "该品类暂无本地因子",
          missing_stages: [],
        });
      }

      case "calculate_footprint": {
        const categoryId = typeof args.category_id === "string" ? args.category_id : "";
        const attributes = asRecord(args.attributes) ?? {};
        const quantity = typeof args.quantity === "number" ? args.quantity : 1;
        const unit = typeof args.unit === "string" ? args.unit : unitForCategory(categoryId);
        const outcome = calculateFootprint({
          category_id: categoryId as CategoryId,
          attributes,
          quantity,
          unit: unit as FootprintRequest["unit"],
        });
        if (!outcome.ok) return fail(outcome.error.code);
        return ok(outcome.result, { confidence: 0.5, nextState: "DECISION" });
      }

      case "compare_alternatives": {
        const rawItems = Array.isArray(args.items) ? args.items : [];
        const items = rawItems.map((item, index) => {
          const record = asRecord(item) ?? {};
          const label = typeof record.label === "string" ? record.label : `选项 ${index + 1}`;
          const itemAttrs = asRecord(record.attributes) ?? {};
          const isReusable =
            itemAttrs.reusable === true || /直饮|自带|水杯|tap/i.test(label);
          const categoryId = isReusable
            ? "other"
            : typeof record.category_id === "string"
              ? record.category_id
              : "other";
          return {
            label,
            category_id: categoryId as CategoryId,
            attributes: isReusable ? { ...itemAttrs, reusable: true } : itemAttrs,
            quantity: 1,
            unit: isReusable ? "bottle" : unitForCategory(categoryId),
          };
        });
        const outcome = compareFootprints(items);
        if (!outcome.ok) return fail(outcome.error.code);
        return ok(outcome.result, { commitmentMade: false });
      }

      case "rank_by_5r": {
        const alternatives = Array.isArray(args.alternatives) ? args.alternatives : [];
        const fiveR = [
          { step: "Refuse", available: false, note: "本场景无拒绝项" },
          { step: "Reduce", available: true, note: "选择更低排放的植物源菜品或减量" },
          { step: "Reuse", available: true, note: "自带可重复餐具/杯具" },
          { step: "Recycle", available: true, note: "剩余包装按校园回收流处置" },
          { step: "Rot", available: true, note: "餐余投入厨余/堆肥回收点" },
        ];
        const ranking = alternatives.map((_, index) => ({
          index,
          level: "Reduce",
          score: Math.max(0, 1 - index * 0.25),
          note: "—",
        }));
        return ok({ five_r: fiveR, ranking });
      }

      case "log_commitment": {
        const commitmentText =
          typeof args.commitment_text === "string" ? args.commitment_text.trim() : "";
        if (commitmentText.length === 0) return fail("INVALID_PAYLOAD");
        const followUpDays = typeof args.follow_up_days === "number" ? args.follow_up_days : 7;
        const created = new Date();
        const due = new Date(created.getTime() + followUpDays * 24 * 60 * 60 * 1000);
        return ok(
          {
            commitment_id: `cmt_${sessionId.slice(-6)}_${Date.now().toString(36)}`,
            created_at: created.toISOString(),
            follow_up_due: due.toISOString(),
            status: "active",
            consent_recorded: false,
          },
          { commitmentMade: true, nextState: "COMMITMENT" },
        );
      }

      default:
        return fail("INVALID_PAYLOAD");
    }
  };
}

function sanitizeModelHeader(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return null;
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : null;
}

export const config = { runtime: "nodejs", maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed; use POST" });
    return;
  }

  const raw = req.body as {
    session_id?: string;
    message?: string;
    locale?: string;
    mode?: "assisted" | "demo";
    context?: { entry_scene?: string; product_hint?: string | null };
  };
  if (!raw || typeof raw.message !== "string" || raw.message.length === 0) {
    res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "message is required" } });
    return;
  }

  // The adapter reads LLM_PROVIDER/LLM_BASE_URL/LLM_API_KEY/LLM_MODEL and the
  // optional LLM_TIMEOUT_MS/LLM_MAX_RETRIES from the Vercel environment.
  const modelOverride = sanitizeModelHeader(req.headers["x-llm-model"] as string | undefined);
  const llm: LlmAdapter = createLlmAdapter(
    modelOverride ? { model: modelOverride } : {},
    process.env,
  );

  const sessionId =
    raw.session_id ?? `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const context: OrchestratorContext = {
    entryScene: raw.context?.entry_scene,
    productHint: raw.context?.product_hint ?? null,
  };

  const orchestrator = new MiOrchestrator({
    llm,
    executor: createNodeExecutor(sessionId),
    sessionId,
    locale: raw.locale,
    mode: raw.mode,
  });

  let events: SseEvent[];
  try {
    events = await orchestrator.handleUserMessage(raw.message, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    events = [
      { event: "error", data: { code: "INTERNAL", message } },
      { event: "done", data: { finish_reason: "error", turn: orchestrator.turn } },
    ];
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  for (const event of events) res.write(encodeSse(event));
  res.end();
}

export type { ChatMessage };
