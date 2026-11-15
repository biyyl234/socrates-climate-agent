/**
 * TTS adapter factory. Provider selection comes from injected config or
 * environment variables; secrets are never embedded in source.
 *
 * - `mock` (default when TTS_PROVIDER is empty): offline placeholder audio.
 * - `volcano`: Volcano Engine adapter; throws missing_credentials until the
 *   VOLC_TTS_* values are supplied.
 * - `none`: NoTTS subtitle-only fallback.
 */

import { MockTts } from "./mock-tts";
import { NoTts } from "./no-tts";
import { VolcanoTts, type VolcanoTtsConfig } from "./volcano";
import type { TtsAdapter } from "./types";

export interface TtsFactoryConfig {
  provider?: string;
  appId?: string;
  accessToken?: string;
  cluster?: string;
  voiceType?: string;
  endpoint?: string;
}

type EnvSource = Record<string, string | undefined>;

export function createTtsAdapter(
  config: TtsFactoryConfig = {},
  env: EnvSource = process.env,
): TtsAdapter {
  const provider = (config.provider ?? env.TTS_PROVIDER ?? "mock").trim().toLowerCase();

  switch (provider) {
    case "none":
    case "off":
      return new NoTts();
    case "volcano":
    case "volcengine":
      return new VolcanoTts({
        appId: config.appId ?? env.VOLC_TTS_APP_ID ?? "",
        accessToken: config.accessToken ?? env.VOLC_TTS_ACCESS_TOKEN ?? "",
        cluster: config.cluster ?? env.VOLC_TTS_CLUSTER ?? "",
        voiceType: config.voiceType ?? env.VOLC_TTS_VOICE_TYPE ?? "",
        endpoint: config.endpoint,
      });
    case "mock":
    case "":
    default:
      return new MockTts();
  }
}

/**
 * Resilient builder: use Volcano only when every credential is present;
 * otherwise fall back to NoTTS (subtitles) rather than a fabricated audio path.
 */
export function createResilientTts(
  config: TtsFactoryConfig = {},
  env: EnvSource = process.env,
): TtsAdapter {
  const allPresent = [config.appId ?? env.VOLC_TTS_APP_ID, config.accessToken ?? env.VOLC_TTS_ACCESS_TOKEN, config.cluster ?? env.VOLC_TTS_CLUSTER, config.voiceType ?? env.VOLC_TTS_VOICE_TYPE].every(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (!allPresent) return new NoTts();
  return createTtsAdapter({ ...config, provider: "volcano" }, env);
}

export type { VolcanoTtsConfig };
