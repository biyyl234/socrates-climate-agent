/**
 * Deterministic engine error contract (report §3.6 / §3.7).
 * A missing factor degrades to a structured explanation — the engine never
 * estimates a number it has no factor for.
 */

export type LcaErrorCode = "INVALID_PAYLOAD" | "FACTOR_NOT_FOUND" | "LCA_ENGINE_ERROR";

export interface LcaEngineError {
  code: LcaErrorCode;
  message: string;
  /** Category ids / stages / labels the engine could not cover. */
  missing: string[];
}

export type Outcome<T> = { ok: true; result: T } | { ok: false; error: LcaEngineError };

export function makeError(code: LcaErrorCode, message: string, missing: string[] = []): LcaEngineError {
  return { code, message, missing };
}
