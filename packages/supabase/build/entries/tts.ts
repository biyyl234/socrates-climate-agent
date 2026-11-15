/**
 * POST /tts — text to speech with subtitle fallback (report §3.8).
 *
 * The resilient adapter factory comes from @socrates/core: real Volcano Speech
 * is used only when every credential is present; otherwise it selects NoTTS
 * (subtitle fallback) rather than fabricating audio. A mock adapter emits empty
 * chunks so the offline demo still completes the SSE sequence.
 */

import {
  createResilientTts,
  TtsError,
  type TtsFormat,
} from "@socrates/core";
import {
  CORS_HEADERS,
  envObject,
  errorResponse,
  preflightResponse,
  readJsonBody,
} from "../shared/http";

const FORMATS = new Set<TtsFormat>(["audio/mp3", "audio/wav"]);

function mapTtsError(error: TtsError): { code: string; status: number; retryAfter: number | null } {
  switch (error.kind) {
    case "timeout":
      return { code: "UPSTREAM_TIMEOUT", status: 504, retryAfter: null };
    case "rate_limit":
      return { code: "RATE_LIMITED", status: 429, retryAfter: 5 };
    case "unavailable":
    case "missing_credentials":
      return { code: "SPEECH_UNAVAILABLE", status: 503, retryAfter: null };
    default:
      return { code: "UPSTREAM_ERROR", status: 502, retryAfter: null };
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") {
    return errorResponse("INVALID_PAYLOAD", "Method not allowed; use POST", [
      { field: "method", reason: "expected POST" },
    ]);
  }

  const body = await readJsonBody(request);
  if (!body.ok) return errorResponse("INVALID_PAYLOAD", "请求体不满足 schema", body.issues);

  const raw = body.value as {
    session_id?: string;
    text?: string;
    voice?: string;
    locale?: string;
    format?: string;
  };

  const issues: Array<{ field: string; reason: string }> = [];
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (text.length === 0) issues.push({ field: "text", reason: "text is required" });
  else if (text.length > 1000) issues.push({ field: "text", reason: "text exceeds 1000 characters" });
  const format = typeof raw.format === "string" && FORMATS.has(raw.format as TtsFormat)
    ? (raw.format as TtsFormat)
    : "audio/mp3";
  if (raw.format !== undefined && !FORMATS.has(raw.format as TtsFormat)) {
    issues.push({ field: "format", reason: "format must be audio/mp3 or audio/wav" });
  }
  if (issues.length > 0) return errorResponse("INVALID_PAYLOAD", "请求字段不满足 schema", issues);

  const env = envObject();
  const adapter = createResilientTts({}, env);
  const encoder = new TextEncoder();

  let lines: string[];
  try {
    if (!adapter.available) {
      // Subtitle-only fallback: no audio bytes, no visemes; text travels as subtitles.
      lines = [
        `event: tts_done\ndata: ${JSON.stringify({
          seq_total: 0,
          characters: text.length,
          voice: raw.voice ?? "none",
          provider: adapter.provider,
          available: false,
          subtitle: text,
          format,
        })}\n\n`,
      ];
    } else {
      const result = await adapter.synthesize({
        sessionId: raw.session_id,
        text,
        voice: raw.voice,
        locale: raw.locale,
        format,
      });
      lines = [];
      for (const viseme of result.visemes) {
        lines.push(`event: viseme\ndata: ${JSON.stringify(viseme)}\n\n`);
      }
      for (const chunk of result.chunks) {
        lines.push(
          `event: audio\ndata: ${JSON.stringify({ chunk: chunk.dataBase64, seq: chunk.seq })}\n\n`,
        );
      }
      lines.push(
        `event: tts_done\ndata: ${JSON.stringify({
          seq_total: result.chunks.length,
          characters: result.characters,
          voice: result.voice,
          provider: adapter.provider,
          available: true,
          format: result.format,
        })}\n\n`,
      );
    }
  } catch (error) {
    if (error instanceof TtsError) {
      const mapped = mapTtsError(error);
      return errorResponse(mapped.code, error.message, [], mapped.retryAfter);
    }
    const message = error instanceof Error ? error.message : "internal error";
    return errorResponse("SPEECH_UNAVAILABLE", message);
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});
