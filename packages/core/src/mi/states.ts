/**
 * MI conversation state machine — frozen enum and allowed-tool matrix
 * (report §6.1). The same enum must be used by the system prompt, the
 * orchestration layer, and the UI; see report §6.4.
 */

export type MIState =
  | "WELCOME"
  | "RAPPORT"
  | "DISCOVERY"
  | "FACT_SHARING"
  | "DECISION"
  | "COMMITMENT"
  | "CLOSING"
  | "GUARDED"
  | "FALLBACK";

export const MI_STATES: MIState[] = [
  "WELCOME",
  "RAPPORT",
  "DISCOVERY",
  "FACT_SHARING",
  "DECISION",
  "COMMITMENT",
  "CLOSING",
  "GUARDED",
  "FALLBACK",
];

/** Tool names (frozen) — report §4. */
export type ToolName =
  | "extract_product_attributes"
  | "map_to_category"
  | "get_emission_factors"
  | "calculate_footprint"
  | "compare_alternatives"
  | "rank_by_5r"
  | "log_commitment";

/** Which tools each state is permitted to call (report §6.1). */
export const ALLOWED_TOOLS: Record<MIState, ToolName[]> = {
  WELCOME: [],
  RAPPORT: [],
  DISCOVERY: ["extract_product_attributes", "map_to_category", "get_emission_factors"],
  FACT_SHARING: ["get_emission_factors", "calculate_footprint"],
  DECISION: ["compare_alternatives", "rank_by_5r", "calculate_footprint"],
  COMMITMENT: ["log_commitment"],
  CLOSING: [],
  GUARDED: [],
  FALLBACK: [],
};

export function isToolAllowed(state: MIState, tool: ToolName): boolean {
  return ALLOWED_TOOLS[state].includes(tool);
}

/** Allowed transitions (report §6.2). */
export const TRANSITIONS: Record<MIState, MIState[]> = {
  WELCOME: ["RAPPORT", "GUARDED", "FALLBACK"],
  RAPPORT: ["DISCOVERY", "GUARDED", "FALLBACK"],
  DISCOVERY: ["FACT_SHARING", "RAPPORT", "GUARDED", "FALLBACK"],
  FACT_SHARING: ["DECISION", "GUARDED", "FALLBACK"],
  DECISION: ["COMMITMENT", "CLOSING", "GUARDED", "FALLBACK"],
  COMMITMENT: ["CLOSING", "GUARDED", "FALLBACK"],
  CLOSING: ["FALLBACK"],
  GUARDED: ["RAPPORT", "CLOSING"],
  FALLBACK: ["WELCOME", "RAPPORT", "DISCOVERY", "FACT_SHARING", "DECISION", "CLOSING"],
};

export function canTransition(from: MIState, to: MIState): boolean {
  return TRANSITIONS[from].includes(to);
}
