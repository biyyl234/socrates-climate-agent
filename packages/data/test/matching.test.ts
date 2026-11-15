import { describe, expect, it } from "vitest";
import type { EmissionFactor } from "../src/types";
import { matchFactor } from "../src/engine/matching";

function makeFactor(over: Partial<EmissionFactor>): EmissionFactor {
  return {
    factor_id: "F-test-001",
    category_id: "meal_beef",
    lifecycle_stage: "agriculture",
    activity: "test",
    activity_unit: "meal",
    emission_factor_value: 1,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "GLOBAL",
    temporal_validity: "2025",
    source_name: "test",
    source_url: "",
    source_publisher: "test",
    license: "待核实",
    attribution: "test",
    version: "0.1",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: { reliability: 3, completeness: 3, temporal: 3, geographic: 3, tech: 3, overall: "C" },
    data_type: "secondary",
    remarks: "test",
    ...over,
  };
}

describe("factor matching by category / stage / geography", () => {
  it("prefers an exact geography match over global average", () => {
    const local = makeFactor({ factor_id: "F-local", geography: "CN" });
    const global = makeFactor({ factor_id: "F-global", geography: "GLOBAL" });
    const hit = matchFactor([local, global], "meal_beef", "agriculture", { geography: "CN" });
    expect(hit?.factor_id).toBe("F-local");
  });

  it("falls back to global average when no local factor exists", () => {
    const global = makeFactor({ factor_id: "F-global", geography: "GLOBAL" });
    const hit = matchFactor([global], "meal_beef", "agriculture", { geography: "CN" });
    expect(hit?.factor_id).toBe("F-global");
  });

  it("still returns a factor when local preference is disabled", () => {
    const us = makeFactor({ factor_id: "F-us", geography: "US" });
    const hit = matchFactor([us], "meal_beef", "agriculture", { geography: "CN", preferLocal: false });
    expect(hit?.factor_id).toBe("F-us");
  });

  it("returns undefined for an unmatched stage", () => {
    const ag = makeFactor({ lifecycle_stage: "agriculture" });
    expect(matchFactor([ag], "meal_beef", "cooking")).toBeUndefined();
  });

  it("returns undefined for an unmatched category", () => {
    const ag = makeFactor({ category_id: "meal_beef" });
    expect(matchFactor([ag], "snack", "agriculture")).toBeUndefined();
  });
});
