/**
 * Offline mock TTS for demo mode. Returns metadata and an empty audio segment;
 * the avatar keeps subtitles and amplitude lip-sync without any network call.
 */

import type { TtsAdapter, TtsRequest, TtsResult } from "./types";
import { splitBySentence } from "./split";

export class MockTts implements TtsAdapter {
  readonly provider = "mock";
  readonly available = true;

  splitBySentence(text: string, maxChars?: number): string[] {
    return splitBySentence(text, maxChars);
  }

  async synthesize(request: TtsRequest): Promise<TtsResult> {
    const format = request.format ?? "audio/mp3";
    const voice = request.voice ?? "zh-CN-mock";
    const sentences = this.splitBySentence(request.text);
    // Placeholder: one empty base64 segment per sentence; no decoded audio bytes.
    const chunks = sentences.map((_, index) => ({ seq: index + 1, dataBase64: "" }));
    return {
      chunks,
      visemes: [],
      characters: request.text.length,
      voice,
      format,
    };
  }
}
