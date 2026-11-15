/**
 * POST /compare — compare alternatives under the same functional unit
 * (report §3.7). Interval-overlap judgment comes from @socrates/data; this
 * function validates input, adds the 5R action view and ascending ranking.
 */

import {
  compareFootprints,
  type CategoryId,
  type CompareRequestItem,
} from "@socrates/data";
import {
  CORS_HEADERS,
  errorResponse,
  preflightResponse,
  readJsonBody,
} from "../shared/http";

const UNITS = new Set(["meal", "bottle", "can", "pack", "item", "g", "ml"]);

function unitForCategory(categoryId: string): CompareRequestItem["unit"] {
  if (categoryId.startsWith("meal")) return "meal";
  if (categoryId === "bottled_water" || categoryId === "beverage") return "bottle";
  if (categoryId === "snack" || categoryId === "snack_packaging" || categoryId === "express_packaging") {
    return "pack";
  }
  return "item";
}

const FIVE_R = [
  { step: "Refuse", available: false, note: "本场景无拒绝项" },
  { step: "Reduce", available: true, note: "选择更低排放的植物源菜品或减量" },
  { step: "Reuse", available: true, note: "自带可重复餐具/杯具" },
  { step: "Recycle", available: true, note: "剩余包装按校园回收流处置" },
  { step: "Rot", available: true, note: "餐余投入厨余/堆肥回收点" },
];

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
    items?: Array<{
      label?: string;
      category_id?: string;
      attributes?: Record<string, unknown>;
      quantity?: number;
      unit?: string;
    }>;
    alternatives?: Array<{ label: string; category_id?: string }>;
  };

  const issues: Array<{ field: string; reason: string }> = [];
  if (!Array.isArray(raw.items) || raw.items.length < 2) {
    issues.push({ field: "items", reason: "对比至少需要 2 项" });
  }
  const items: CompareRequestItem[] = [];
  if (Array.isArray(raw.items)) {
    raw.items.forEach((item, index) => {
      if (typeof item.category_id !== "string" || item.category_id.trim().length === 0) {
        issues.push({ field: `items[${index}].category_id`, reason: "category_id is required" });
      }
      if (item.unit !== undefined && !UNITS.has(item.unit)) {
        issues.push({ field: `items[${index}].unit`, reason: "unit not in allowed enum" });
      }
      items.push({
        label: item.label,
        category_id: (item.category_id ?? "other") as CategoryId,
        attributes: item.attributes ?? {},
        quantity: typeof item.quantity === "number" && item.quantity >= 0 ? item.quantity : 1,
        unit: (item.unit ?? unitForCategory(item.category_id ?? "other")) as CompareRequestItem["unit"],
      });
    });
  }
  if (issues.length > 0) return errorResponse("INVALID_PAYLOAD", "请求字段不满足 schema", issues);

  const outcome = compareFootprints(items);
  if (!outcome.ok) {
    const code = outcome.error.code === "FACTOR_NOT_FOUND" ? "FACTOR_NOT_FOUND" : "UPSTREAM_ERROR";
    return errorResponse(code, outcome.error.message, outcome.error.missing.map((m) => ({ field: "items", reason: m })));
  }

  const result = outcome.result;
  const maxValue = Math.max(...result.items.map((item) => item.footprint.value), 1e-9);
  const ranking = [...result.items]
    .sort((a, b) => a.footprint.value - b.footprint.value)
    .map((item) => ({
      index: item.index,
      level: "Reduce",
      score: Math.round(Math.max(0, 1 - item.footprint.value / maxValue) * 10000) / 10000,
      note: result.overlap
        ? "区间存在重叠，不宣称绝对优劣"
        : "同功能单位下区间下限仍高于对比项上限",
    }));

  const response = {
    functional_unit: result.functional_unit,
    items: result.items,
    overlap: result.overlap,
    ranking,
    five_r: FIVE_R,
    alternatives: raw.alternatives ?? [],
    caveats: result.caveats,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
});
