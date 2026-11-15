import { describe, expect, it } from "vitest";
import {
  convertActivity,
  DEFAULT_BOTTLE_ML,
  DEFAULT_PACK_G,
  DEFAULT_PORTION_G,
  functionalUnitLabel,
} from "../src/engine/units";

describe("functional-unit / activity conversion whitelist (report §8.3)", () => {
  it("passes through matching units", () => {
    expect(convertActivity(3, "meal", "meal")).toEqual({ ok: true, result: 3 });
    expect(convertActivity(2, "bottle", "bottle")).toEqual({ ok: true, result: 2 });
    expect(convertActivity(5, "pack", "pack")).toEqual({ ok: true, result: 5 });
  });

  it("converts grams to meals on the default portion", () => {
    const out = convertActivity(DEFAULT_PORTION_G, "g", "meal");
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result).toBeCloseTo(1, 10);
  });

  it("converts ml to bottles on the default size", () => {
    const out = convertActivity(DEFAULT_BOTTLE_ML, "ml", "bottle");
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result).toBeCloseTo(1, 10);
  });

  it("converts grams to packs on the default size", () => {
    const out = convertActivity(DEFAULT_PACK_G, "g", "pack");
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result).toBeCloseTo(1, 10);
  });

  it("passes through grams and millilitres", () => {
    const grams = convertActivity(500, "g", "g");
    expect(grams.ok).toBe(true);
    if (grams.ok) expect(grams.result).toBe(500);
    const ml = convertActivity(250, "ml", "ml");
    expect(ml.ok).toBe(true);
    if (ml.ok) expect(ml.result).toBe(250);
  });

  it("rejects unsupported conversions", () => {
    const out = convertActivity(1, "bottle", "meal");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("INVALID_PAYLOAD");
  });

  it("rejects non-negative quantity", () => {
    expect(convertActivity(-1, "meal", "meal").ok).toBe(false);
    expect(convertActivity(NaN, "meal", "meal").ok).toBe(false);
  });

  it("renders functional-unit labels", () => {
    expect(functionalUnitLabel("meal_beef", "meal")).toBe(`1 份标准食堂套餐（${DEFAULT_PORTION_G} g）`);
    expect(functionalUnitLabel("bottled_water", "bottle")).toBe(`1 瓶（${DEFAULT_BOTTLE_ML} ml）`);
    expect(functionalUnitLabel("snack", "pack")).toBe(`1 包（${DEFAULT_PACK_G} g）`);
  });
});
