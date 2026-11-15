/**
 * Factor selection by category, lifecycle stage and geography (report §9.1).
 * Local factors are preferred when `preferLocal` is true; global-average
 * factors ("GLOBAL") are the neutral fallback. The engine never invents a
 * factor when none matches.
 */

import type { CategoryId, EmissionFactor, LifecycleStage } from "../types";

const GLOBAL_GEO = "GLOBAL";

interface MatchOptions {
  geography?: string;
  preferLocal?: boolean;
}

function geoScore(factorGeo: string, requestedGeo: string | undefined, preferLocal: boolean): number {
  if (!requestedGeo) return 2;
  if (!preferLocal) return 2;
  if (factorGeo === requestedGeo) return 3;
  if (factorGeo === GLOBAL_GEO) return 2;
  return 1;
}

/**
 * Pick the best factor for one category/stage. Returns undefined when no
 * factor matches the category or stage.
 */
export function matchFactor(
  factors: EmissionFactor[],
  categoryId: CategoryId,
  stage: LifecycleStage,
  options: MatchOptions = {},
): EmissionFactor | undefined {
  const { geography, preferLocal = true } = options;
  let best: EmissionFactor | undefined;
  let bestScore = -1;

  for (const f of factors) {
    if (f.category_id !== categoryId || f.lifecycle_stage !== stage) continue;
    const score = geoScore(f.geography, geography, preferLocal);
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}

/** All factors for a category, ordered by lifecycle-stage registry order. */
export function factorsByStage(
  factors: EmissionFactor[],
  categoryId: CategoryId,
  stages: LifecycleStage[],
): EmissionFactor[] {
  const out: EmissionFactor[] = [];
  for (const stage of stages) {
    const hit = matchFactor(factors, categoryId, stage);
    if (hit) out.push(hit);
  }
  return out;
}
