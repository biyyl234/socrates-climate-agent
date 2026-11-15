/**
 * TS payload types for the seven registered LLM tools (report §4).
 * Argument interfaces mirror the `parameters` schema; result interfaces mirror
 * the `result_schema`. Shared domain shapes reuse @socrates/data where possible.
 */

import type {
  CategoryId,
  CompareResult,
  FiveRStep,
  FootprintResult,
  LifecycleStage,
  ProductAttributes,
} from "@socrates/data";

// ---------------------------------------------------------------------------
// 4.1 extract_product_attributes
// ---------------------------------------------------------------------------

export interface ExtractProductAttributesArgs {
  free_text: string;
  image_ocr?: string | null;
}

export type ExtractProductAttributesResult = ProductAttributes;

// ---------------------------------------------------------------------------
// 4.2 map_to_category
// ---------------------------------------------------------------------------

/** Attribute subset required by the mapping tool. */
export interface MapToCategoryAttributes {
  product_name: string;
  brand: string | null;
  category_hint: CategoryId;
  ingredients: string[];
  package_format: ProductAttributes["package_format"];
  quantity_text?: string | null;
  confidence?: number;
}

export interface MapToCategoryArgs {
  attributes: MapToCategoryAttributes;
}

export interface CategoryAlternative {
  category_id: string;
  reason: string;
}

export interface MapToCategoryResult {
  category_id: string;
  category_path: string[];
  mapped: boolean;
  match_confidence: number;
  alternatives: CategoryAlternative[];
  need_clarification?: boolean;
  clarification_question?: string | null;
}

// ---------------------------------------------------------------------------
// 4.3 get_emission_factors
// ---------------------------------------------------------------------------

export type FactorStageQuery = LifecycleStage | "all";

export interface PedigreeResult {
  reliability: number;
  completeness: number;
  temporal: number;
  geographic: number;
  tech: number;
  overall: "A" | "B" | "C" | "D" | "E";
}

export interface FactorRecordResult {
  factor_id: string;
  stage: string;
  activity: string;
  activity_unit: string;
  factor_value: number;
  factor_unit: string;
  interval_low: number | null;
  interval_high: number | null;
  gwp_version?: string;
  geography?: string;
  temporal?: string;
  dq: PedigreeResult;
  source_name: string;
  source_url: string;
  license: string;
  attribution?: string;
  version: string;
  valid_from: string;
  valid_to?: string | null;
  data_type: "primary" | "secondary";
}

export interface GetEmissionFactorsArgs {
  category_id: string;
  lifecycle_stage?: FactorStageQuery;
  geography?: string;
  season?: string | null;
  prefer_local?: boolean;
}

export interface GetEmissionFactorsResult {
  factors: FactorRecordResult[];
  selection_note: string;
  missing_stages?: string[];
}

// ---------------------------------------------------------------------------
// 4.4 calculate_footprint
// ---------------------------------------------------------------------------

export type FootprintUnit = "meal" | "bottle" | "can" | "pack" | "item" | "g" | "ml";

export interface CalculateFootprintArgs {
  category_id: string;
  attributes: Record<string, unknown>;
  quantity: number;
  unit: FootprintUnit;
  factor_set_id?: string | null;
}

export type CalculateFootprintResult = FootprintResult;

// ---------------------------------------------------------------------------
// 4.5 compare_alternatives
// ---------------------------------------------------------------------------

export interface CompareItemRequest {
  label: string;
  category_id: string;
  attributes?: Record<string, unknown>;
}

export interface CompareAlternativesArgs {
  items: CompareItemRequest[];
}

export type CompareAlternativesResult = CompareResult;

// ---------------------------------------------------------------------------
// 4.6 rank_by_5r
// ---------------------------------------------------------------------------

export interface RankAlternative {
  label: string;
  footprint?: unknown;
  attributes?: Record<string, unknown>;
}

export interface RankBy5rArgs {
  alternatives: RankAlternative[];
  /** Reserved: user preference weights; not enabled in the first release. */
  weights?: unknown;
}

export interface FiveRRankingEntry {
  index: number;
  level: string;
  score: number;
  note: string;
}

export interface RankBy5rResult {
  five_r: FiveRStep[];
  ranking: FiveRRankingEntry[];
}

// ---------------------------------------------------------------------------
// 4.7 log_commitment
// ---------------------------------------------------------------------------

export interface LogCommitmentArgs {
  commitment_text: string;
  category_id: string;
  alternative: string;
  barrier?: string | null;
  plan?: string | null;
  self_efficacy?: number;
  follow_up_days?: number;
}

export interface LogCommitmentResult {
  commitment_id: string;
  created_at: string;
  follow_up_due: string | null;
  status: "active" | "cancelled";
  consent_recorded: boolean;
}

/** Discriminated union of all tool argument payloads. */
export type ToolArgs =
  | ExtractProductAttributesArgs
  | MapToCategoryArgs
  | GetEmissionFactorsArgs
  | CalculateFootprintArgs
  | CompareAlternativesArgs
  | RankBy5rArgs
  | LogCommitmentArgs;
