/**
 * Factor library loader. Pure data access; no network, no LLM, no factor
 * generation. Matching/selection logic lives in the engine.
 */

import type { CategoryId, EmissionFactor } from "../types";
import { FACTORS } from "./factors";

/** All shipped factors, in registry order. */
export function getAllFactors(): EmissionFactor[] {
  return FACTORS.map((f) => ({ ...f, dq: { ...f.dq } }));
}

/** Look up a factor by id; returns undefined when absent. */
export function getFactorById(factorId: string): EmissionFactor | undefined {
  return FACTORS.find((f) => f.factor_id === factorId);
}

/** Factors belonging to one category. */
export function getFactorsByCategory(categoryId: CategoryId): EmissionFactor[] {
  return FACTORS.filter((f) => f.category_id === categoryId).map((f) => ({
    ...f,
    dq: { ...f.dq },
  }));
}

/** Categories that currently have at least one factor. */
export function getCoveredCategories(): CategoryId[] {
  const seen = new Set<CategoryId>();
  for (const f of FACTORS) seen.add(f.category_id);
  return Array.from(seen);
}

export * from "./sources";
