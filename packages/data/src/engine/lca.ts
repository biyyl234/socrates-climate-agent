/**
 * Deterministic attributional-LCA engine (report §8, §3.6, §3.7).
 *
 * Guarantees:
 * - Pure functions: no network, no LLM, no new factor generation.
 * - Point value = Σ (factor × activity amount) over matched stages.
 * - Interval = conservative envelope: Σ stage lows, Σ stage highs; no log-normal
 *   propagation (report §8.5).
 * - Source interval used when both bounds exist; otherwise the pedigree grade's
 *   symmetric multiplier envelope.
 * - A missing factor degrades to a structured FACTOR_NOT_FOUND explanation;
 *   the engine never fills in an estimate.
 */

import {
  LIFECYCLE_STAGES,
  type CategoryId,
  type CompareItem,
  type CompareResult,
  type EmissionFactor,
  type FactorCitation,
  type FootprintRequest,
  type FootprintResult,
  type LifecycleStage,
  type PhaseResult,
} from "../types";
import { getAllFactors } from "../factors";
import { makeError, type Outcome } from "./errors";
import { factorsByStage, matchFactor } from "./matching";
import {
  confidenceForGrade,
  intervalFromGrade,
  round4,
  worstGrade,
} from "./pedigree";
import { convertActivity, functionalUnitLabel } from "./units";

const CATEGORY_IDS: CategoryId[] = [
  "bottled_water",
  "beverage",
  "meal_beef",
  "meal_veggie",
  "snack",
  "snack_packaging",
  "express_packaging",
  "other",
];

const STAGE_LABELS: Record<LifecycleStage, string> = {
  agriculture: "原料/养殖",
  processing: "加工",
  transport: "运输",
  cooking: "食堂烹饪",
  packaging: "包装/餐具",
  use: "使用",
  end_of_life: "末端处置",
};

const DEFAULT_LABELS: Record<CategoryId, string> = {
  bottled_water: "瓶装水",
  beverage: "瓶装饮料",
  meal_beef: "牛肉套餐",
  meal_veggie: "素食套餐",
  snack: "包装零食",
  snack_packaging: "零食包装",
  express_packaging: "快递包装",
  other: "直饮水",
};

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && (CATEGORY_IDS as string[]).includes(value);
}

function geographyOf(attributes: Record<string, unknown> | undefined): string | undefined {
  const g = attributes?.geography;
  return typeof g === "string" && g.length > 0 ? g : undefined;
}

interface StageCalc {
  factor: EmissionFactor;
  amount: number;
  phase: PhaseResult;
}

function cite(factor: EmissionFactor): FactorCitation {
  return {
    factor_id: factor.factor_id,
    stage: factor.lifecycle_stage,
    source_name: factor.source_name,
    source_url: factor.source_url,
    license: factor.license,
    dq: factor.dq,
    valid_from: factor.valid_from,
    valid_to: factor.valid_to,
  };
}

function calculateStages(request: FootprintRequest, factors: EmissionFactor[]): Outcome<StageCalc[]> {
  const geography = geographyOf(request.attributes);
  const stages = factorsByStage(factors, request.category_id, LIFECYCLE_STAGES);
  const calcs: StageCalc[] = [];

  for (const factor of stages) {
    const amount = convertActivity(request.quantity, request.unit, factor.activity_unit);
    if (!amount.ok) return amount;
    const value = round4(factor.emission_factor_value * amount.result);

    let interval: [number, number];
    if (factor.interval_low != null && factor.interval_high != null) {
      interval = [
        round4(factor.interval_low * amount.result),
        round4(factor.interval_high * amount.result),
      ];
    } else {
      interval = intervalFromGrade(value, factor.dq.overall);
    }

    calcs.push({
      factor,
      amount: amount.result,
      phase: {
        stage: factor.lifecycle_stage,
        label: STAGE_LABELS[factor.lifecycle_stage],
        value,
        interval,
      },
    });
  }

  return { ok: true, result: calcs };
}

/** Calculate one footprint request. Library may be injected for tests. */
export function calculateFootprint(
  request: FootprintRequest,
  factors: EmissionFactor[] = getAllFactors(),
): Outcome<FootprintResult> {
  if (!isCategoryId(request.category_id)) {
    return {
      ok: false,
      error: makeError("INVALID_PAYLOAD", `非法品类码：${String(request.category_id)}`, [
        String(request.category_id),
      ]),
    };
  }

  const categoryFactors = factors.filter((f) => f.category_id === request.category_id);
  if (categoryFactors.length === 0) {
    return {
      ok: false,
      error: makeError(
        "FACTOR_NOT_FOUND",
        "未找到该品类的可用排放因子，已停止估算；请补充产品属性或选择已覆盖品类。",
        [request.category_id],
      ),
    };
  }

  const stages = calculateStages(request, categoryFactors);
  if (!stages.ok) return stages;

  const calcs = stages.result;
  if (calcs.length === 0) {
    return {
      ok: false,
      error: makeError(
        "FACTOR_NOT_FOUND",
        "该品类在已覆盖阶段中无可用因子；已停止估算。",
        [request.category_id],
      ),
    };
  }

  const totalValue = round4(calcs.reduce((sum, c) => sum + c.phase.value, 0));
  const totalLow = round4(calcs.reduce((sum, c) => sum + c.phase.interval[0], 0));
  const totalHigh = round4(calcs.reduce((sum, c) => sum + c.phase.interval[1], 0));
  const width = totalValue > 0 ? (totalHigh - totalLow) / totalValue : 0;
  const overall = worstGrade(calcs.map((c) => c.factor.dq.overall));
  const confidence = confidenceForGrade(overall, width);

  const geography = geographyOf(request.attributes);
  const notes: string[] = [];
  if (geography && calcs.some((c) => c.factor.geography !== geography && c.factor.geography !== "GLOBAL")) {
    notes.push("地理代表性偏弱：部分因子为全球/欧洲平均场景，本地餐食或产品需谨慎解读。");
  }
  notes.push("区间为保守包络估计：各阶段下限、上限分别求和，未做对数正态传播（报告 §8.5）。");

  const covered = new Set(calcs.map((c) => c.factor.lifecycle_stage));
  const uncovered = LIFECYCLE_STAGES.filter((s) => !covered.has(s));
  if (uncovered.length > 0) {
    notes.push(`未覆盖阶段：${uncovered.map((s) => STAGE_LABELS[s]).join("、")}。`);
  }

  const activityUnit = calcs[0]?.factor.activity_unit ?? "item";

  return {
    ok: true,
    result: {
      functional_unit: functionalUnitLabel(request.category_id, activityUnit),
      total: {
        value: totalValue,
        unit: "kgCO2e",
        interval: [totalLow, totalHigh],
        confidence,
      },
      phases: calcs.map((c) => c.phase),
      factors: calcs.map((c) => cite(c.factor)),
      data_quality: { overall, notes },
      disclaimer: "本结果为归因型 LCA 估算区间，用于教育对话，不作为采购、认证或标签声明依据。",
    },
  };
}

export interface CompareRequestItem {
  category_id: CategoryId;
  attributes?: Record<string, unknown>;
  quantity: number;
  unit: FootprintRequest["unit"];
  label?: string;
}

function intervalsOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

/** Compare two or more requests under the same functional unit (report §3.7). */
export function compareFootprints(
  items: CompareRequestItem[],
  factors: EmissionFactor[] = getAllFactors(),
): Outcome<CompareResult> {
  if (items.length < 2) {
    return {
      ok: false,
      error: makeError("INVALID_PAYLOAD", "对比至少需要 2 项。", []),
    };
  }

  const results: CompareItem[] = [];
  const caveats: string[] = ["区间存在重叠时不宣称绝对优劣。", "地理与季节差异未完全纳入。"];
  let functionalUnit = "";

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const request: FootprintRequest = {
      category_id: item.category_id,
      attributes: item.attributes ?? {},
      quantity: item.quantity,
      unit: item.unit,
    };
    const calc = calculateFootprint(request, factors);
    if (!calc.ok) {
      return {
        ok: false,
        error: {
          ...calc.error,
          missing: [`#${i} ${item.label ?? DEFAULT_LABELS[item.category_id]}`, ...calc.error.missing],
        },
      };
    }
    const footprint = calc.result;
    if (i === 0) functionalUnit = footprint.functional_unit;

    results.push({
      index: i,
      label: item.label ?? DEFAULT_LABELS[item.category_id],
      footprint: {
        value: footprint.total.value,
        unit: footprint.total.unit,
        interval: footprint.total.interval,
      },
      dq: footprint.data_quality.overall,
    });
    caveats.push(...footprint.data_quality.notes);
  }

  let overlap = false;
  for (let i = 0; i < results.length && !overlap; i += 1) {
    for (let j = i + 1; j < results.length; j += 1) {
      if (intervalsOverlap(results[i]!.footprint.interval, results[j]!.footprint.interval)) {
        overlap = true;
        break;
      }
    }
  }

  return {
    ok: true,
    result: { functional_unit: functionalUnit, items: results, overlap, caveats },
  };
}

/** Re-export for callers that need stage-level factor lookup. */
export { matchFactor };
