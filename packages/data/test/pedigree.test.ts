import { describe, expect, it } from "vitest";
import {
  confidenceForGrade,
  GRADE_MULTIPLIERS,
  gradeFromMean,
  gradeFromScores,
  intervalFromGrade,
  worstGrade,
} from "../src/engine/pedigree";

describe("pedigree overall grade (report §8.6)", () => {
  it("maps mean boundaries to grades", () => {
    expect(gradeFromMean(4.5)).toBe("A");
    expect(gradeFromMean(4.49)).toBe("B");
    expect(gradeFromMean(3.5)).toBe("B");
    expect(gradeFromMean(3.49)).toBe("C");
    expect(gradeFromMean(2.5)).toBe("C");
    expect(gradeFromMean(2.49)).toBe("D");
    expect(gradeFromMean(1.5)).toBe("D");
    expect(gradeFromMean(1.49)).toBe("E");
  });

  it("recomputes grade from five scores", () => {
    // 3,3,3,2,3 -> mean 2.8 -> C
    expect(gradeFromScores(3, 3, 3, 2, 3)).toBe("C");
    // 2,2,3,2,3 -> mean 2.4 -> D
    expect(gradeFromScores(2, 2, 3, 2, 3)).toBe("D");
    // all 5 -> A
    expect(gradeFromScores(5, 5, 5, 5, 5)).toBe("A");
  });

  it("uses the frozen grade multipliers", () => {
    expect(GRADE_MULTIPLIERS.A).toEqual([1.0, 1.1]);
    expect(GRADE_MULTIPLIERS.B).toEqual([1.1, 1.25]);
    expect(GRADE_MULTIPLIERS.C).toEqual([1.25, 1.45]);
    expect(GRADE_MULTIPLIERS.D).toEqual([1.45, 1.7]);
    expect(GRADE_MULTIPLIERS.E).toEqual([1.7, 2.0]);
  });

  it("builds a symmetric pedigree envelope", () => {
    expect(intervalFromGrade(10, "C")).toEqual([12.5, 14.5]);
    expect(intervalFromGrade(0.15, "D")).toEqual([0.2175, 0.255]);
  });

  it("maps confidence by grade and width", () => {
    expect(confidenceForGrade("A", 0.1)).toBe("high");
    expect(confidenceForGrade("B", 0.2)).toBe("medium");
    expect(confidenceForGrade("C", 0.1)).toBe("medium");
    expect(confidenceForGrade("C", 0.5)).toBe("low");
    expect(confidenceForGrade("D", 0.9)).toBe("low");
    expect(confidenceForGrade("E", 0.9)).toBe("low");
  });

  it("picks the worst grade", () => {
    expect(worstGrade(["A", "B", "C"])).toBe("C");
    expect(worstGrade(["D", "A"])).toBe("D");
    expect(worstGrade(["E", "D"])).toBe("E");
  });
});
