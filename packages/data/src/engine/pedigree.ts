/**
 * Pedigree matrix and uncertainty rules (report §8.5 / §8.6).
 * Five dimensions scored 1–5 (5 best); overall grade from the five-dimension
 * mean; grade drives symmetric interval multipliers and confidence mapping.
 */

import type { Confidence, Pedigree, QualityGrade } from "../types";

/** Grade boundaries on the five-dimension mean (report §8.6). */
export function gradeFromMean(mean: number): QualityGrade {
  if (mean >= 4.5) return "A";
  if (mean >= 3.5) return "B";
  if (mean >= 2.5) return "C";
  if (mean >= 1.5) return "D";
  return "E";
}

/** Five-dimension mean, rounded to 4 decimals to keep comparisons stable. */
export function meanScore(
  p: Pick<Pedigree, "reliability" | "completeness" | "temporal" | "geographic" | "tech">,
): number {
  const sum = p.reliability + p.completeness + p.temporal + p.geographic + p.tech;
  return Math.round((sum / 5) * 10000) / 10000;
}

/** Recompute the overall grade from the five scores (used to validate factors). */
export function gradeFromScores(
  reliability: number,
  completeness: number,
  temporal: number,
  geographic: number,
  tech: number,
): QualityGrade {
  return gradeFromMean(meanScore({ reliability, completeness, temporal, geographic, tech }));
}

/**
 * Symmetric interval multipliers per grade (report §8.6):
 * A 1.00–1.10, B 1.10–1.25, C 1.25–1.45, D 1.45–1.70, E 1.70–2.00.
 */
export const GRADE_MULTIPLIERS: Record<QualityGrade, [number, number]> = {
  A: [1.0, 1.1],
  B: [1.1, 1.25],
  C: [1.25, 1.45],
  D: [1.45, 1.7],
  E: [1.7, 2.0],
};

/** Pedigree-generated conservative interval for a point value. */
export function intervalFromGrade(value: number, grade: QualityGrade): [number, number] {
  const [lowMul, highMul] = GRADE_MULTIPLIERS[grade];
  return [round4(value * lowMul), round4(value * highMul)];
}

/**
 * Confidence mapping (report §8.5): A/B → high/medium, C → medium/low,
 * D/E → low. A wide relative interval downgrades within C.
 */
export function confidenceForGrade(grade: QualityGrade, relativeWidth: number): Confidence {
  switch (grade) {
    case "A":
      return "high";
    case "B":
      return "medium";
    case "C":
      return relativeWidth > 0.35 ? "low" : "medium";
    case "D":
    case "E":
      return "low";
  }
}

/** Worst (lowest) grade among a list; E is worst, A best. */
export function worstGrade(grades: QualityGrade[]): QualityGrade {
  const rank: Record<QualityGrade, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  let worst: QualityGrade = "A";
  for (const g of grades) {
    if (rank[g] > rank[worst]) worst = g;
  }
  return worst;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
