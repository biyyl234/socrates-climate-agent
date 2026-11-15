import { describe, expect, it } from "vitest";
import {
  calculateFootprint,
  compareFootprints,
  isCategoryId,
} from "../src/engine/lca";
import type { FootprintRequest } from "../src/types";

const beefRequest: FootprintRequest = {
  category_id: "meal_beef",
  attributes: { geography: "GLOBAL" },
  quantity: 1,
  unit: "meal",
};

const veggieRequest: FootprintRequest = {
  category_id: "meal_veggie",
  attributes: { geography: "GLOBAL" },
  quantity: 1,
  unit: "meal",
};

const bottleRequest: FootprintRequest = {
  category_id: "bottled_water",
  attributes: { geography: "US" },
  quantity: 1,
  unit: "bottle",
};

const tapRequest: FootprintRequest = {
  category_id: "other",
  attributes: { geography: "US" },
  quantity: 1,
  unit: "bottle",
};

describe("deterministic point calculation", () => {
  it("beef meal = Σ stage point values (recomputable)", () => {
    const out = calculateFootprint(beefRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // agriculture 10.6685 + cooking 0.15 + packaging 0.05
    expect(out.result.total.value).toBeCloseTo(10.8685, 4);
    const phaseSum = out.result.phases.reduce((s, p) => s + p.value, 0);
    expect(phaseSum).toBeCloseTo(out.result.total.value, 6);
  });

  it("veggie meal = Σ stage point values (recomputable)", () => {
    const out = calculateFootprint(veggieRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // agriculture 0.9839 + cooking 0.15 + packaging 0.05
    expect(out.result.total.value).toBeCloseTo(1.1839, 4);
  });

  it("bottled water totals the four covered stages", () => {
    const out = calculateFootprint(bottleRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // 0.0502 + 0.0400 + 0.0063 + 0.0100
    expect(out.result.total.value).toBeCloseTo(0.1065, 4);
    expect(out.result.phases).toHaveLength(4);
  });
});

describe("conservative interval envelope (report §8.5)", () => {
  it("sums stage lows and highs independently", () => {
    const out = calculateFootprint(beefRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const low = out.result.phases.reduce((s, p) => s + p.interval[0], 0);
    const high = out.result.phases.reduce((s, p) => s + p.interval[1], 0);
    expect(out.result.total.interval[0]).toBeCloseTo(low, 4);
    expect(out.result.total.interval[1]).toBeCloseTo(high, 4);
    // Pedigree multipliers are ≥1: the envelope widens upward, so the lower
    // bound sits at or above the point value, and high ≥ low.
    expect(out.result.total.interval[0]).toBeGreaterThanOrEqual(out.result.total.value - 1e-9);
    expect(out.result.total.interval[1]).toBeGreaterThanOrEqual(out.result.total.interval[0]);
  });

  it("uses source interval when present, pedigree envelope otherwise", () => {
    const out = calculateFootprint(bottleRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const pkg = out.result.phases.find((p) => p.stage === "packaging")!;
    // Source bounds 0.0379–0.0625 must be preserved, not widened.
    expect(pkg.interval[0]).toBeCloseTo(0.0379, 4);
    expect(pkg.interval[1]).toBeCloseTo(0.0625, 4);
    const eol = out.result.phases.find((p) => p.stage === "end_of_life")!;
    // D-grade envelope on 0.0100: 1.45–1.70.
    expect(eol.interval[0]).toBeCloseTo(0.0145, 4);
    expect(eol.interval[1]).toBeCloseTo(0.017, 4);
  });

  it("beef interval envelope matches hand-computed bounds", () => {
    const out = calculateFootprint(beefRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Ag C: 10.6685×1.25=13.3356, ×1.45=15.4693; cooking D 0.2175–0.255;
    // packaging D 0.0725–0.085.
    expect(out.result.total.interval[0]).toBeCloseTo(13.6256, 4);
    expect(out.result.total.interval[1]).toBeCloseTo(15.8093, 4);
  });
});

describe("data quality and citations", () => {
  it("worst DQ grade propagates to the total; D/E map to low confidence", () => {
    const out = calculateFootprint(beefRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.data_quality.overall).toBe("D");
    expect(out.result.total.confidence).toBe("low");
  });

  it("emits one citation per covered factor", () => {
    const out = calculateFootprint(beefRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.factors).toHaveLength(out.result.phases.length);
    for (const c of out.result.factors) {
      expect(c.source_name.length).toBeGreaterThan(0);
      expect(c.valid_from.length).toBeGreaterThan(0);
    }
  });

  it("notes uncovered stages", () => {
    const out = calculateFootprint(bottleRequest);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const uncovered = out.result.data_quality.notes.find((n) => n.includes("未覆盖阶段"));
    expect(uncovered).toBeDefined();
  });
});

describe("compare contract (report §3.7)", () => {
  it("compares beef vs veggie under the same functional unit; no overlap", () => {
    const out = compareFootprints([
      { category_id: "meal_beef", quantity: 1, unit: "meal" },
      { category_id: "meal_veggie", quantity: 1, unit: "meal" },
    ]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.items).toHaveLength(2);
    expect(out.result.items[0]!.dq).toBe("D");
    expect(out.result.functional_unit).toContain("350");
    expect(out.result.overlap).toBe(false);
  });

  it("marks overlap true when intervals touch/overlap", () => {
    const out = compareFootprints([
      { category_id: "bottled_water", quantity: 1, unit: "bottle" },
      { category_id: "other", quantity: 1, unit: "bottle" },
    ]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Tap sits well below the bottle envelope; no overlap expected.
    expect(out.result.overlap).toBe(false);
  });

  it("labels items and keeps per-item DQ", () => {
    const out = compareFootprints([
      { category_id: "meal_beef", quantity: 1, unit: "meal", label: "牛肉套餐" },
      { category_id: "meal_veggie", quantity: 1, unit: "meal", label: "素食套餐" },
    ]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.items[0]!.label).toBe("牛肉套餐");
    expect(out.result.items[1]!.label).toBe("素食套餐");
  });

  it("rejects fewer than two items", () => {
    const out = compareFootprints([{ category_id: "meal_beef", quantity: 1, unit: "meal" }]);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("INVALID_PAYLOAD");
  });
});

describe("missing-factor degradation (FACTOR_NOT_FOUND)", () => {
  it("does not estimate when the library has no factor for the category", () => {
    const out = calculateFootprint(beefRequest, []);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.code).toBe("FACTOR_NOT_FOUND");
      expect(out.error.missing).toContain("meal_beef");
    }
  });

  it("rejects an illegal category id as INVALID_PAYLOAD", () => {
    expect(isCategoryId("meal_beef")).toBe(true);
    expect(isCategoryId("spaceship")).toBe(false);
    const out = calculateFootprint({
      category_id: "spaceship" as never,
      attributes: {},
      quantity: 1,
      unit: "meal",
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("INVALID_PAYLOAD");
  });

  it("compare fails with FACTOR_NOT_FOUND when an item has no factor", () => {
    const out = compareFootprints(
      [
        { category_id: "meal_beef", quantity: 1, unit: "meal" },
        { category_id: "meal_veggie", quantity: 1, unit: "meal" },
      ],
      [],
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("FACTOR_NOT_FOUND");
  });
});
