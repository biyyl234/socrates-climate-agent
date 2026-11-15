/**
 * Normalized TTS error mapping (report §3.2: SPEECH_UNAVAILABLE / RATE_LIMITED /
 * UPSTREAM_TIMEOUT). The orchestrator maps these to SSE `error` events.
 */

export type TtsErrorKind =
  | "missing_credentials"
  | "unavailable"
  | "timeout"
  | "rate_limit"
  | "upstream"
  | "invalid_response";

export class TtsError extends Error {
  readonly kind: TtsErrorKind;
  readonly status?: number;
  override readonly cause?: unknown;

  constructor(kind: TtsErrorKind, message: string, status?: number, cause?: unknown) {
    super(message);
    this.name = "TtsError";
    this.kind = kind;
    this.status = status;
    this.cause = cause;
  }
}
