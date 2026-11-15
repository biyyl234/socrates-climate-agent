/**
 * No-TTS fallback (report §3.8: SPEECH_UNAVAILABLE → stop requesting audio,
 * keep subtitles). `available` is false so the UI hides voice controls; calling
 * `synthesize` rejects with a normalized unavailable error.
 */

import { TtsError } from "./errors";
import type { TtsAdapter, TtsRequest, TtsResult } from "./types";
import { splitBySentence } from "./split";

export class NoTts implements TtsAdapter {
  readonly provider = "none";
  readonly available = false;

  splitBySentence(text: string, maxChars?: number): string[] {
    return splitBySentence(text, maxChars);
  }

  async synthesize(_request: TtsRequest): Promise<TtsResult> {
    throw new TtsError("unavailable", "TTS is disabled; subtitles are retained as fallback.");
  }
}
