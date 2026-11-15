/**
 * Versioned postMessage protocol between the app shell and the avatar bundle.
 * Every message is wrapped in an envelope carrying the protocol name and an
 * integer schema version. Bumping AVATAR_PROTOCOL_VERSION requires changes on
 * both sides; unknown message types are ignored rather than throwing.
 */

export const AVATAR_PROTOCOL = "socrates-avatar";
export const AVATAR_PROTOCOL_VERSION = 1;

export type AvatarState =
  | "Idle"
  | "Listening"
  | "Thinking"
  | "Speaking"
  | "Affirm"
  | "Celebrate"
  | "Fallback";

export type ExpressionId =
  | "exp-neutral"
  | "exp-smile"
  | "exp-listen"
  | "exp-think"
  | "exp-affirm"
  | "exp-invite"
  | "exp-celebrate"
  | "exp-curious"
  | "exp-apology";

export type MotionId =
  | "m-idle-breath"
  | "m-blink"
  | "m-nod"
  | "m-point-card"
  | "m-palm-up"
  | "m-raise-hand"
  | "m-head-tilt"
  | "m-gentle-shake";

/** Degradation levels L0 (full) → L4 (text only). */
export type AvatarLevel = 0 | 1 | 2 | 3 | 4;

export interface AvatarCapabilities {
  live2d: boolean;
  tts: boolean;
  amplitudeLipSync: boolean;
  lottie: boolean;
  modelId: string | null;
}

/** App → Avatar command payloads. */
export type AppToAvatar =
  | { type: "init"; payload: { level: AvatarLevel; theme: "light" | "dark"; locale: string } }
  | { type: "speak"; payload: { utteranceId: string; text: string; audioUrl?: string | null } }
  | { type: "stop_speak"; payload: Record<string, never> }
  | { type: "set_state"; payload: { state: AvatarState } }
  | { type: "expression"; payload: { expressionId: ExpressionId } }
  | { type: "motion"; payload: { motionId: MotionId } }
  | { type: "set_level"; payload: { level: AvatarLevel } }
  | { type: "set_tts"; payload: { enabled: boolean } };

/** Avatar → App event payloads. */
export type AvatarToApp =
  | { type: "ready"; payload: { capabilities: AvatarCapabilities; level: AvatarLevel } }
  | {
      type: "hit";
      payload: { hitArea: string; x: number; y: number };
    }
  | { type: "speak_started"; payload: { utteranceId: string } }
  | { type: "speak_ended"; payload: { utteranceId: string } }
  | { type: "level_changed"; payload: { level: AvatarLevel; reason: string } }
  | { type: "error"; payload: { code: string; message: string; recoverable: boolean } }
  | { type: "metrics"; payload: { fps: number; memoryMb?: number } };

export type Envelope<T extends { type: string; payload: unknown }> = {
  protocol: typeof AVATAR_PROTOCOL;
  version: number;
  messageId: string;
  type: T["type"];
  payload: T["payload"];
};

let seq = 0;
export function wrap<T extends AppToAvatar | AvatarToApp>(message: T): Envelope<T> {
  seq += 1;
  return {
    protocol: AVATAR_PROTOCOL,
    version: AVATAR_PROTOCOL_VERSION,
    messageId: `msg_${Date.now().toString(36)}_${seq}`,
    type: message.type,
    payload: message.payload,
  };
}

export function isEnvelope(raw: unknown): raw is Envelope<AppToAvatar | AvatarToApp> {
  if (typeof raw !== "object" || raw === null) return false;
  const e = raw as Record<string, unknown>;
  return (
    e.protocol === AVATAR_PROTOCOL &&
    typeof e.version === "number" &&
    typeof e.type === "string"
  );
}

/**
 * Type guard for narrowing a received envelope to a specific message type.
 * Usage: if (matches(envelope, "ready")) { envelope.payload ... }
 */
export function matches<
  E extends Envelope<AppToAvatar | AvatarToApp>,
  K extends (AppToAvatar | AvatarToApp)["type"],
>(envelope: E, type: K): boolean {
  return envelope.type === type;
}
