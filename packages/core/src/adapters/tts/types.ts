/**
 * Unified TTS adapter contract (report §3.8). The avatar lip-sync baseline uses
 * AnalyserNode amplitude and does not depend on visemes; visemes are an
 * optional enhancement carried alongside the audio chunks.
 */

export type TtsFormat = "audio/mp3" | "audio/wav";

export interface TtsRequest {
  sessionId?: string;
  text: string;
  voice?: string;
  locale?: string;
  format?: TtsFormat;
}

export interface TtsAudioChunk {
  seq: number;
  /** Base64-encoded audio segment; concatenate chunks in `seq` order. */
  dataBase64: string;
}

export interface TtsViseme {
  /** Relative seconds from utterance start. */
  time: number;
  visemeId: string;
  duration: number;
}

export interface TtsResult {
  chunks: TtsAudioChunk[];
  visemes: TtsViseme[];
  characters: number;
  voice: string;
  format: TtsFormat;
}

export interface TtsAdapter {
  readonly provider: string;
  /** False when the adapter intentionally produces no audio (NoTTS fallback). */
  readonly available: boolean;
  synthesize(request: TtsRequest): Promise<TtsResult>;
  /** Split long text into utterance-safe chunks (report §3.8: sentence splitting). */
  splitBySentence(text: string, maxChars?: number): string[];
}
