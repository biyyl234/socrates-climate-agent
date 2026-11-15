/**
 * Deterministic tool executor wired to the shared packages.
 *
 * Every numeric / LCA result here comes from @socrates/data; topic guards and
 * tool schema validation stay in @socrates/core. This layer only adapts between
 * the orchestrator's ToolExecutor contract and the REST/data APIs.
 */

import {
  calculateFootprint,
  compareFootprints,
  getFactorsByCategory,
  isCategoryId,
  type CategoryId,
  type EmissionFactor,
  type FootprintRequest,
} from "@socrates/data";
import type {
  OrchestratorSignals,
  ToolExecutionOutcome,
  ToolExecutor,
  ToolName,
} from "@socrates/core";
import { restInsert, type RestEnv } from "./rest";

type Args = Record<string, unknown>;

function asRecord(value: unknown): Args | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Args;
}

function unitForCategory(categoryId: string): FootprintRequest["unit"] {
  if (categoryId.startsWith("meal")) return "meal";
  if (categoryId === "bottled_water" || categoryId === "beverage") return "bottle";
  if (categoryId === "snack" || categoryId === "snack_packaging" || categoryId === "express_packaging") {
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

export interface ExecutorDeps {
  env: RestEnv;
  sessionId: string;
}

export function createToolExecutor(deps: ExecutorDeps): ToolExecutor {
  const { env, sessionId } = deps;

  return async function execute(tool: ToolName, rawArgs: Args): Promise<ToolExecutionOutcome> {
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
        const hint = typeof attributes.category_hint === "string" ? attributes.category_hint : "other";
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
        if (!outcome.ok) {
          return fail(outcome.error.code);
        }
        return ok(outcome.result, {
          confidence: 0.5,
          nextState: "DECISION",
        });
      }

      case "compare_alternatives": {
        const rawItems = Array.isArray(args.items) ? args.items : [];
        const items = rawItems.map((item, index) => {
          const record = asRecord(item) ?? {};
          const categoryId = typeof record.category_id === "string" ? record.category_id : "other";
          return {
            label: typeof record.label === "string" ? record.label : `选项 ${index + 1}`,
            category_id: categoryId as CategoryId,
            attributes: asRecord(record.attributes) ?? {},
            quantity: 1,
            unit: unitForCategory(categoryId),
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
        const commitmentText = typeof args.commitment_text === "string" ? args.commitment_text.trim() : "";
        if (commitmentText.length === 0) return fail("INVALID_PAYLOAD");
        const followUpDays =
          typeof args.follow_up_days === "number" ? args.follow_up_days : 7;
        const created = new Date();
        const due = new Date(created.getTime() + followUpDays * 24 * 60 * 60 * 1000);
        const row = await restInsert(env, "commitments", {
          session_id: sessionId,
          profile_id: null,
          commitment_text: commitmentText,
          category_id: typeof args.category_id === "string" ? args.category_id : null,
          alternative: typeof args.alternative === "string" ? args.alternative : null,
          barrier: typeof args.barrier === "string" ? args.barrier : null,
          plan: typeof args.plan === "string" ? args.plan : null,
          self_efficacy:
            typeof args.self_efficacy === "number" ? args.self_efficacy : null,
          follow_up_days: followUpDays,
          follow_up_due: due.toISOString(),
          status: "active",
          consent_recorded: false,
        });
        const record = row as { id?: string };
        return ok(
          {
            commitment_id: record.id ?? "cmt_unknown",
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
