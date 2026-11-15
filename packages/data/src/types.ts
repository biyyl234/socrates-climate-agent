/**
 * Frozen domain types for the factor library and deterministic LCA engine.
 * Mirrors the report §9.1 (factor schema) and §3.6 / §3.7 (result contracts).
 * The LLM never produces these values; the deterministic engine does.
 */

export type LifecycleStage =
  | "agriculture"
  | "processing"
  | "transport"
  | "cooking"
  | "packaging"
  | "use"
  | "end_of_life";

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  "agriculture",
  "processing",
  "transport",
  "cooking",
  "packaging",
  "use",
  "end_of_life",
];

/** Internal standard category ids (frozen enum). */
export type CategoryId =
  | "bottled_water"
  | "beverage"
  | "meal_beef"
  | "meal_veggie"
  | "snack"
  | "snack_packaging"
  | "express_packaging"
  | "other";

export type Confidence = "high" | "medium" | "low";

export type QualityGrade = "A" | "B" | "C" | "D" | "E";

export interface Pedigree {
  reliability: number; // 1-5
  completeness: number;
  temporal: number;
  geographic: number;
  tech: number;
  overall: QualityGrade;
}

export interface EmissionFactor {
  factor_id: string; // F-<category>-<seq>
  category_id: CategoryId;
  lifecycle_stage: LifecycleStage;
  activity: string;
  activity_unit: string; // g / kg / meal / bottle / pack
  emission_factor_value: number; // kgCO2e / activity_unit
  emission_factor_unit: string;
  interval_low: number | null;
  interval_high: number | null;
  gwp_version: string; // e.g. AR6-GWP100
  geography: string;
  temporal_validity: string;
  source_name: string;
  source_url: string;
  source_publisher: string;
  license: string;
  attribution: string;
  version: string;
  valid_from: string;
  valid_to: string | null;
  dq: Pedigree;
  data_type: "primary" | "secondary";
  remarks: string;
}

/** A normalized product/meal attribute set produced by the LLM extraction tool. */
export interface ProductAttributes {
  product_name: string;
  brand: string | null;
  category_hint: CategoryId;
  ingredients: string[];
  package_format: "bottle" | "can" | "cup" | "tray" | "bag" | "wrapper" | "reusable" | "other";
  quantity_text: string | null;
  confidence: number;
  missing_fields: string[];
}

export interface FootprintRequest {
  category_id: CategoryId;
  attributes: Record<string, unknown>;
  quantity: number;
  unit: "meal" | "bottle" | "can" | "pack" | "item" | "g" | "ml";
  baseline?: unknown;
}

export interface PhaseResult {
  stage: LifecycleStage;
  label: string;
  value: number;
  interval: [number, number];
}

export interface FactorCitation {
  factor_id: string;
  stage: LifecycleStage;
  source_name: string;
  source_url: string;
  license: string;
  dq: Pedigree;
  valid_from: string;
  valid_to: string | null;
}

export interface TotalResult {
  value: number;
  unit: string;
  interval: [number, number];
  confidence: Confidence;
}

export interface FootprintResult {
  functional_unit: string;
  total: TotalResult;
  phases: PhaseResult[];
  factors: FactorCitation[];
  data_quality: { overall: QualityGrade; notes: string[] };
  disclaimer: string;
}

export interface CompareItem {
  index: number;
  label: string;
  footprint: { value: number; unit: string; interval: [number, number] };
  dq: QualityGrade;
}

export interface CompareResult {
  functional_unit: string;
  items: CompareItem[];
  overlap: boolean;
  caveats: string[];
}

export interface FiveRStep {
  step: "Refuse" | "Reduce" | "Reuse" | "Recycle" | "Rot";
  available: boolean;
  note: string;
}
