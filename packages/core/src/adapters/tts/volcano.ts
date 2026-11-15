/**
 * Volcano Engine (火山引擎) speech adapter.
 *
 * Credentials are injected (or supplied via VOLC_TTS_* environment variables).
 * The request/response mapping and audio-format conversion are implemented; the
 * live upstream call is a placeholder until credentials are provided, per the
 * project freeze: this adapter never silently degrades to a fabricated result.
 */

import { TtsError } from "./errors";
import type { TtsAdapter, TtsFormat, TtsRequest, TtsResult } from "./types";
import { splitBySentence } from "./split";

export interface VolcanoTtsConfig {
  appId: string;
  accessToken: string;
  cluster: string;
  voiceType: string;
  endpoint?: string;
  defaultFormat?: TtsFormat;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface VolcanoPayload {
  app: { appid: string; token: string; cluster: string };
  user: { uid: string };
  audio: { voice_type: string; encoding: string };
  request: { reqid: string; text: string; operation: "query" };
}

function encodingFor(format: TtsFormat): string {
  return format === "audio/wav" ? "wav" : "mp3";
}

export class VolcanoTts implements TtsAdapter {
  readonly provider = "volcano";
  readonly available = true;
  private readonly config: VolcanoTtsConfig;
  private readonly fetchImpl?: typeof fetch;

  constructor(config: VolcanoTtsConfig) {
    this.assertConfigured(config);
    this.config = config;
    this.fetchImpl = config.fetchImpl;
  }

  private assertConfigured(config: VolcanoTtsConfig): void {
    for (const field of ["appId", "accessToken", "cluster", "voiceType"] as const) {
      const value = config[field];
      if (!value || value.trim().length === 0) {
        throw new TtsError(
          "missing_credentials",
          `Volcano TTS is missing ${field}; set VOLC_TTS_${field.toUpperCase()} or inject it.`,
        );
      }
    }
  }

  splitBySentence(text: string, maxChars?: number): string[] {
    return splitBySentence(text, maxChars);
  }

  /** Map an internal utterance to the Volcano request body. */
  buildPayload(chunk: string, index: number, format: TtsFormat, sessionId?: string): VolcanoPayload {
    return {
      app: {
        appid: this.config.appId,
        token: this.config.accessToken,
        cluster: this.config.cluster,
      },
      user: { uid: sessionId ?? "socrates-demo" },
      audio: {
        voice_type: this.config.voiceType,
        encoding: encodingFor(format),
      },
      request: {
        reqid: `tts_${Date.now().toString(36)}_${index}`,
        text: chunk,
        operation: "query",
      },
    };
  }

  private parseAudioBase64(raw: unknown): string {
    if (typeof raw !== "object" || raw === null) {
      throw new TtsError("invalid_response", "Volcano TTS returned a non-object payload");
    }
    const candidate = (raw as { data?: unknown }).data;
    if (typeof candidate !== "string" || candidate.length === 0) {
      throw new TtsError("invalid_response", "Volcano TTS payload has no audio data");
    }
    return candidate;
  }

  async synthesize(request: TtsRequest): Promise<TtsResult> {
    this.assertConfigured(this.config);

    const format = request.format ?? this.config.defaultFormat ?? "audio/mp3";
    const voice = request.voice ?? this.config.voiceType;
    const sentences = this.splitBySentence(request.text);

    if (!this.fetchImpl || !this.config.endpoint) {
      throw new TtsError(
        "unavailable",
        "Volcano TTS upstream is not wired yet; credentials and endpoint are pending.",
      );
    }

    const chunks = [];
    for (let i = 0; i < sentences.length; i += 1) {
      const payload = this.buildPayload(sentences[i]!, i + 1, format, request.sessionId);
      const response = await this.fetchImpl(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new TtsError("upstream", `Volcano TTS failed (HTTP ${response.status})`, response.status);
      }
      const payloadJson = (await response.json()) as unknown;
      chunks.push({ seq: i + 1, dataBase64: this.parseAudioBase64(payloadJson) });
    }

    return {
      chunks,
      visemes: [],
      characters: request.text.length,
      voice,
      format,
    };
  }
}
