/**
 * Thin adapter over the deterministic @socrates/data engine used by the app UI.
 * Numeric outputs come from these calls only; nothing in the app hard-codes a
 * footprint value.
 */
import { calculateFootprint, compareFootprints } from "@socrates/data";
import type { CompareResult, FootprintResult } from "@socrates/data";
import type { StoryId } from "../types/chat";

export function waterFootprint(): FootprintResult | null {
  const out = calculateFootprint({
    category_id: "bottled_water",
    attributes: {},
    quantity: 1,
    unit: "bottle",
  });
  return out.ok ? out.result : null;
}

export function waterCompare(): CompareResult | null {
  const out = compareFootprints([
    { category_id: "bottled_water", label: "瓶装水（500 mL）", quantity: 1, unit: "bottle" },
    { category_id: "other", label: "直饮水 / 自带水杯", quantity: 1, unit: "bottle" },
  ]);
  return out.ok ? out.result : null;
}

export function mealCompare(): CompareResult | null {
  const out = compareFootprints([
    { category_id: "meal_beef", label: "牛肉餐（标准份）", quantity: 1, unit: "meal" },
    { category_id: "meal_veggie", label: "素食餐（标准份）", quantity: 1, unit: "meal" },
  ]);
  return out.ok ? out.result : null;
}

export function compareForStory(story: StoryId): CompareResult | null {
  return story === "water" ? waterCompare() : mealCompare();
}
