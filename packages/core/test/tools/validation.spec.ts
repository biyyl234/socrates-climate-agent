import { describe, expect, it } from "vitest";
import {
  validateToolArgs,
  validateToolCall,
  validateToolForState,
  validateToolResult,
} from "../../src/tools";
import type { ToolName } from "../../src/mi/states";

const VALID_ARGS: Record<ToolName, Record<string, unknown>> = {
  extract_product_attributes: { free_text: "一瓶 500ml 矿泉水", image_ocr: null },
  map_to_category: {
    attributes: {
      product_name: "矿泉水",
      brand: null,
      category_hint: "bottled_water",
      ingredients: ["水"],
      package_format: "bottle",
      confidence: 0.8,
    },
  },
  get_emission_factors: {
    category_id: "bottled_water",
    lifecycle_stage: "all",
    geography: "CN",
    prefer_local: true,
  },
  calculate_footprint: {
    category_id: "meal_beef",
    attributes: { portion_g: 350 },
    quantity: 1,
    unit: "meal",
  },
  compare_alternatives: {
    items: [
      { label: "牛肉套餐", category_id: "meal_beef" },
      { label: "素食套餐", category_id: "meal_veggie" },
    ],
  },
  rank_by_5r: { alternatives: [{ label: "素食套餐" }], weights: null },
  log_commitment: {
    commitment_text: "本周午餐选两次素食套餐",
    category_id: "meal_veggie",
    alternative: "素食替代牛肉",
    self_efficacy: 4,
    follow_up_days: 7,
  },
};

describe("tool argument validation", () => {
  it("accepts a valid argument payload for every tool", () => {
    for (const [tool, args] of Object.entries(VALID_ARGS) as [ToolName, Record<string, unknown>][]) {
      const result = validateToolArgs(tool, args);
      expect(result.ok, `${tool}: ${JSON.stringify(result.issues)}`).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    expect(validateToolArgs("extract_product_attributes", {}).ok).toBe(false);
    expect(validateToolArgs("map_to_category", { attributes: {} }).ok).toBe(false);
    expect(validateToolArgs("calculate_footprint", { category_id: "x" }).ok).toBe(false);
  });

  it("rejects invalid enums and out-of-range numbers", () => {
    expect(
      validateToolArgs("calculate_footprint", {
        category_id: "meal_beef",
        attributes: {},
        quantity: 1,
        unit: "kg",
      }).ok,
    ).toBe(false);
    expect(
      validateToolArgs("calculate_footprint", {
        category_id: "meal_beef",
        attributes: {},
        quantity: -2,
        unit: "meal",
      }).ok,
    ).toBe(false);
    expect(
      validateToolArgs("log_commitment", {
        commitment_text: "x",
        category_id: "meal_veggie",
        alternative: "y",
        self_efficacy: 6,
      }).ok,
    ).toBe(false);
    expect(
      validateToolArgs("compare_alternatives", {
        items: [{ label: "only", category_id: "snack" }],
      }).ok,
    ).toBe(false);
  });

  it("rejects additional properties not declared in the schema", () => {
    const result = validateToolArgs("extract_product_attributes", {
      free_text: "x",
      secret_field: 1,
    });
    expect(result.ok).toBe(false);
  });
});

describe("tool result validation", () => {
  const validFootprint = {
    functional_unit: "1 份标准套餐（350 g）",
    total: { value: 4.86, unit: "kgCO2e", interval: [3.62, 6.1], confidence: "medium" },
    phases: [
      { stage: "agriculture", label: "原料/养殖", value: 3.92, interval: [2.9, 4.98] },
    ],
    factors: [
      {
        factor_id: "F-meal-beef-001",
        source_name: "Agribalyse 3.2",
        source_url: "https://data.ademe.fr/datasets/agribalyse-31-detail-par-ingredient",
        license: "Etalab Open Licence 2.0",
        version: "3.2",
      },
    ],
    data_quality: { overall: "B", notes: ["地理代表性偏弱"] },
    disclaimer: "归因型 LCA 估算区间，用于教育对话。",
  };

  it("accepts a valid footprint result", () => {
    expect(validateToolResult("calculate_footprint", validFootprint).ok).toBe(true);
  });

  it("rejects negative values, reversed intervals and unregistered sources", () => {
    const negative = { ...validFootprint, total: { ...validFootprint.total, value: -1 } };
    expect(validateToolResult("calculate_footprint", negative).ok).toBe(false);

    const reversed = {
      ...validFootprint,
      total: { ...validFootprint.total, interval: [6.1, 3.62] },
    };
    expect(validateToolResult("calculate_footprint", reversed).ok).toBe(false);

    const badSource = {
      ...validFootprint,
      factors: [{ ...validFootprint.factors[0], source_url: "https://evil.example.com/x" }],
    };
    expect(validateToolResult("calculate_footprint", badSource).ok).toBe(false);
  });

  it("rejects a factor value outside its interval", () => {
    const factorResult = {
      factors: [
        {
          factor_id: "F-1",
          stage: "agriculture",
          activity: "牛肉 100g",
          activity_unit: "100 g",
          factor_value: 9.9,
          factor_unit: "kgCO2e/100 g",
          interval_low: 2.1,
          interval_high: 3.65,
          dq: {
            reliability: 3,
            completeness: 3,
            temporal: 4,
            geographic: 2,
            tech: 3,
            overall: "B",
          },
          source_name: "Agribalyse",
          source_url: "https://data.ademe.fr/x",
          license: "Etalab Open Licence 2.0",
          version: "3.2",
          valid_from: "2025-01-01",
          data_type: "secondary",
        },
      ],
      selection_note: "note",
    };
    expect(validateToolResult("get_emission_factors", factorResult).ok).toBe(false);
  });
});

describe("MI state tool gating", () => {
  it("allows DISCOVERY extraction/mapping/factor tools only", () => {
    expect(validateToolForState("DISCOVERY", "map_to_category").ok).toBe(true);
    expect(validateToolForState("DISCOVERY", "calculate_footprint").ok).toBe(false);
  });

  it("allows DECISION comparison and 5R tools", () => {
    expect(validateToolForState("DECISION", "compare_alternatives").ok).toBe(true);
    expect(validateToolForState("DECISION", "log_commitment").ok).toBe(false);
  });

  it("rejects every tool in WELCOME", () => {
    expect(validateToolForState("WELCOME", "extract_product_attributes").ok).toBe(false);
  });

  it("validateToolCall combines state gate and argument schema", () => {
    const denied = validateToolCall("WELCOME", "map_to_category", VALID_ARGS.map_to_category);
    expect(denied.ok).toBe(false);
    const allowed = validateToolCall(
      "DISCOVERY",
      "map_to_category",
      VALID_ARGS.map_to_category,
    );
    expect(allowed.ok).toBe(true);
  });
});
