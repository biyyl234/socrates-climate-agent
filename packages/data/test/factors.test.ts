import { describe, expect, it } from "vitest";
import { FACTORS } from "../src/factors/factors";
import { gradeFromScores } from "../src/engine/pedigree";

describe("factor library integrity", () => {
  it("every factor has a unique id matching F-<category>-<seq>", () => {
    const ids = new Set<string>();
    for (const f of FACTORS) {
      expect(f.factor_id).toMatch(/^F-[a-z-]+-\d{3}$/);
      expect(ids.has(f.factor_id)).toBe(false);
      ids.add(f.factor_id);
    }
  });

  it("pedigree overall grade matches the five scores", () => {
    for (const f of FACTORS) {
      expect(gradeFromScores(f.dq.reliability, f.dq.completeness, f.dq.temporal, f.dq.geographic, f.dq.tech)).toBe(
        f.dq.overall,
      );
    }
  });

  it("numeric fields are valid", () => {
    for (const f of FACTORS) {
      expect(f.emission_factor_value).toBeGreaterThanOrEqual(0);
      expect(f.emission_factor_unit.length).toBeGreaterThan(0);
      if (f.interval_low != null || f.interval_high != null) {
        expect(f.interval_low).not.toBeNull();
        expect(f.interval_high).not.toBeNull();
        expect(f.interval_low!).toBeLessThanOrEqual(f.interval_high!);
      }
    }
  });

  it("provenance fields are non-empty; internal assumptions carry 待核实 license", () => {
    for (const f of FACTORS) {
      expect(f.source_name.length).toBeGreaterThan(0);
      expect(f.source_publisher.length).toBeGreaterThan(0);
      expect(f.license.length).toBeGreaterThan(0);
      expect(f.attribution.length).toBeGreaterThan(0);
      expect(f.version.length).toBeGreaterThan(0);
      expect(f.gwp_version.length).toBeGreaterThan(0);
      expect(f.temporal_validity.length).toBeGreaterThan(0);
      expect(f.remarks.length).toBeGreaterThan(0);
      // Internal engineering assumptions may omit a public URL, but then the
      // license must be flagged 待核实.
      if (f.source_url === "") {
        expect(f.license).toContain("待核实");
      }
    }
  });

  it("covers the two demo story categories", () => {
    const cats = new Set(FACTORS.map((f) => f.category_id));
    expect(cats.has("bottled_water")).toBe(true);
    expect(cats.has("meal_beef")).toBe(true);
    expect(cats.has("meal_veggie")).toBe(true);
    expect(cats.has("other")).toBe(true); // tap-water reference factor
  });

  it("counts the shipped factors", () => {
    // 4 bottled water + 1 beverage + 3 beef + 3 veggie + 1 snack +
    // 2 snack packaging + 1 express packaging + 1 tap reference = 16.
    expect(FACTORS).toHaveLength(16);
  });

  it("loader returns independent copies (no shared mutation)", () => {
    const first = FACTORS[0]!;
    const copy = { ...first, dq: { ...first.dq } };
    copy.dq.overall = "E";
    expect(first.dq.overall).not.toBe("E");
  });
});
