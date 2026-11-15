/**
 * Functional-unit and activity-amount conversion whitelist (report §8.3).
 * Only the constants below are allowed; the engine never invents unit factors.
 * Unsupported unit combinations return an INVALID_PAYLOAD outcome.
 */

import type { FootprintRequest } from "../types";
import { makeError, type Outcome } from "./errors";

/** Default functional-unit sizes when attributes omit them (report §8.3). */
export const DEFAULT_PORTION_G = 350; // g per standard meal
export const DEFAULT_BOTTLE_ML = 500; // ml per bottle
export const DEFAULT_PACK_G = 100; // g per pack

/**
 * Convert the requested activity amount into the factor's activity unit.
 *
 * Allowed mappings:
 * - meal ↔ meal; g → meal via DEFAULT_PORTION_G
 * - bottle ↔ bottle; ml → bottle via DEFAULT_BOTTLE_ML
 * - pack ↔ pack; g → pack via DEFAULT_PACK_G
 * - g ↔ g; kg → g (×1000)
 * - ml ↔ ml; L → ml (×1000)
 */
export function convertActivity(
  quantity: number,
  requestUnit: FootprintRequest["unit"],
  factorActivityUnit: string,
): Outcome<number> {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false, error: makeError("INVALID_PAYLOAD", "quantity must be a non-negative number", []) };
  }

  const unit = requestUnit;

  // Direct match.
  if (unit === factorActivityUnit) return { ok: true, result: quantity };

  // Mass conversions (request enum exposes grams only).
  if (unit === "g" && factorActivityUnit === "g") return { ok: true, result: quantity };

  // Volume conversions (request enum exposes millilitres only).
  if (unit === "ml" && factorActivityUnit === "ml") return { ok: true, result: quantity };

  // Functional-unit conversions.
  if (factorActivityUnit === "meal") {
    if (unit === "meal") return { ok: true, result: quantity };
    if (unit === "g") return { ok: true, result: quantity / DEFAULT_PORTION_G };
  }
  if (factorActivityUnit === "bottle") {
    if (unit === "bottle") return { ok: true, result: quantity };
    if (unit === "ml") return { ok: true, result: quantity / DEFAULT_BOTTLE_ML };
  }
  if (factorActivityUnit === "pack") {
    if (unit === "pack") return { ok: true, result: quantity };
    if (unit === "g") return { ok: true, result: quantity / DEFAULT_PACK_G };
  }

  return {
    ok: false,
    error: makeError(
      "INVALID_PAYLOAD",
      `Unsupported unit conversion: request unit "${unit}" → factor unit "${factorActivityUnit}"`,
      [unit, factorActivityUnit],
    ),
  };
}

/** Functional-unit label shown on the data card (report §3.6). */
export function functionalUnitLabel(categoryId: string, activityUnit: string): string {
  switch (activityUnit) {
    case "meal":
      return `1 份标准食堂套餐（${DEFAULT_PORTION_G} g）`;
    case "bottle":
      return `1 瓶（${DEFAULT_BOTTLE_ML} ml）`;
    case "pack":
      return `1 包（${DEFAULT_PACK_G} g）`;
    default:
      return `1 ${categoryId}`;
  }
}
