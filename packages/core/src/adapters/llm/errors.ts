/**
 * Normalized LLM error mapping (report §3.2). Every upstream / transport
 * failure is converted into an `LlmError` with a stable `kind` so the
 * orchestrator can map it to an SSE error code without provider-specific
 * branching.
 */

export type LlmErrorKind =
  | "missing_credentials"
  | "auth"
  | "unavailable"
  | "timeout"
  | "rate_limit"
  | "upstream"
  | "invalid_response";

export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  readonly status?: number;
  override readonly cause?: unknown;

  constructor(kind: LlmErrorKind, message: string, status?: number, cause?: unknown) {
    super(message);
    this.name = "LlmError";
    this.kind = kind;
    this.status = status;
    this.cause = cause;
  }
}
