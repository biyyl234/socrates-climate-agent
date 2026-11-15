/**
 * Static configuration for the avatar bundle.
 *
 * The Live2D engine, model asset and protocol mappings are isolated inside
 * `apps/avatar` so the whole rendering layer can be replaced without touching
 * the app shell.
 */
import type {
  AvatarCapabilities,
  AvatarLevel,
  AvatarState,
  ExpressionId,
  MotionId,
} from "@socrates/core";

/** Haru (Cubism 3/4 compatible) free sample model, bundled under public/live2d. */
export const MODEL_URL = "./live2d/Haru/Haru.model3.json";
export const MODEL_ID = "haru";

/**
 * Protocol expression id -> Haru expression file name.
 *
 * Haru's built-in expressions are limited (F01..F08); the mapping is a
 * best-effort approximation aligned to §2.7.2. A missing or failing expression
 * falls back to neutral (F01) instead of throwing.
 */
export const EXPRESSION_TO_FILE: Record<ExpressionId, string> = {
  "exp-neutral": "F01",
  "exp-smile": "F05",
  "exp-listen": "F06",
  "exp-think": "F04",
  "exp-affirm": "F05",
  "exp-invite": "F01",
  "exp-celebrate": "F02",
  "exp-curious": "F06",
  "exp-apology": "F08",
};

/** Default expression applied when entering each state (§2.7.3). */
export const STATE_EXPRESSION: Record<AvatarState, ExpressionId> = {
  Idle: "exp-neutral",
  Listening: "exp-listen",
  Thinking: "exp-think",
  Speaking: "exp-smile",
  Affirm: "exp-affirm",
  Celebrate: "exp-celebrate",
  Fallback: "exp-apology",
};

/**
 * Degradation ladder (§2.8.7, mapped to the five levels exposed by the protocol):
 *
 * - L0 完整 Live2D+TTS:  Live2D model + TTS audio + amplitude lip sync + full automations
 * - L1 振幅口型:          Live2D model kept; mouth driven by amplitude only; no TTS audio
 * - L2 静态立绘+轻动效:   Canvas-drawn portrait with breathing / blink; audio allowed
 * - L3 简化角色:          Geometric Canvas character, basic state cues; no audio
 * - L4 纯文字:            Text bubble overlay only; no character, no audio
 */
export function capabilitiesForLevel(level: AvatarLevel): AvatarCapabilities {
  switch (level) {
    case 0:
      return { live2d: true, tts: true, amplitudeLipSync: true, lottie: false, modelId: MODEL_ID };
    case 1:
      return { live2d: true, tts: false, amplitudeLipSync: true, lottie: false, modelId: MODEL_ID };
    case 2:
      return { live2d: false, tts: true, amplitudeLipSync: false, lottie: true, modelId: null };
    case 3:
      return { live2d: false, tts: false, amplitudeLipSync: false, lottie: true, modelId: null };
    case 4:
      return { live2d: false, tts: false, amplitudeLipSync: false, lottie: false, modelId: null };
  }
}

/** Protocol motion id -> Cubism motion group in the Haru model, if one exists. */
export const MOTION_GROUP: Record<MotionId, string | null> = {
  "m-idle-breath": "Idle",
  "m-blink": null, // handled by the engine's built-in auto blink
  "m-nod": "TapBody",
  "m-point-card": "TapBody",
  "m-palm-up": "TapBody",
  "m-raise-hand": "TapBody",
  "m-head-tilt": null, // approximated with head parameters in the stage
  "m-gentle-shake": null, // approximated with head parameters in the stage
};

/** Estimated speaking pace: characters per second for text-rhythm fallback lip sync. */
export const FALLBACK_CHARS_PER_SECOND = 11;
/** Minimum / maximum utterance length (seconds) for the no-audio fallback mouth. */
export const FALLBACK_MIN_SECONDS = 1.2;
export const FALLBACK_MAX_SECONDS = 10;
