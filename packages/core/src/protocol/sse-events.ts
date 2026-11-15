/**
 * SSE event contract for the /chat edge function (report §3.4).
 * The wire format is `event: <name>` + `data: <json>` lines. These types
 * describe the parsed data payload for each event name.
 */

import type { FootprintResult, CompareResult } from "@socrates/data";
import type { MIState } from "../mi/states";

export type ChatErrorCode =
  | "INVALID_PAYLOAD"
  | "SESSION_REQUIRED"
  | "TOPIC_BLOCKED"
  | "PRODUCT_NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "LLM_UNAVAILABLE"
  | "SPEECH_UNAVAILABLE"
  | "UPSTREAM_TIMEOUT"
  | "INTERNAL";

export interface ChatRequest {
  session_id?: string;
  message: string; // 1-1000 chars
  locale?: string;
  mode?: "assisted" | "demo";
  context?: { entry_scene?: string; product_hint?: string | null };
}

export type SseEvent =
  | { event: "state"; data: { session_id: string; mi_state: MIState; turn: number } }
  | { event: "tool_call"; data: { tool: string; args: Record<string, unknown> } }
  | { event: "tool_result"; data: { tool: string; ok: boolean; result?: unknown; error?: ChatErrorCode } }
  | { event: "token"; data: { delta: string } }
  | { event: "datacard"; data: FootprintResult }
  | { event: "compare"; data: CompareResult }
  | { event: "commitment"; data: { commitment_id: string; suggested: boolean } }
  | { event: "error"; data: { code: ChatErrorCode; message: string } }
  | { event: "done"; data: { finish_reason: "stop" | "tool_limit" | "blocked" | "error"; turn: number } };

export type SseEventName = SseEvent["event"];

/** Serialize one parsed event to the SSE wire text. */
export function encodeSse(evt: SseEvent): string {
  return `event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`;
}
