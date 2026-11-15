/** Imperative bridge exposed by the AvatarHost to the chat screen. */
import type {
  AvatarCapabilities,
  AvatarLevel,
  AvatarState,
  ExpressionId,
  MotionId,
} from "@socrates/core";

export interface AvatarBridge {
  /** Avatar bundle reported `ready`. */
  ready: boolean;
  /** Active degradation level L0–L4. */
  level: AvatarLevel;
  capabilities: AvatarCapabilities | null;
  /** First user gesture has unlocked audio playback. */
  audioUnlocked: boolean;
  lastError: { code: string; message: string } | null;
  unlockAudio: () => void;
  speak: (utteranceId: string, text: string, audioUrl?: string | null) => void;
  stopSpeak: () => void;
  setState: (state: AvatarState) => void;
  expression: (id: ExpressionId) => void;
  motion: (id: MotionId) => void;
  setLevel: (level: AvatarLevel) => void;
  setTts: (enabled: boolean) => void;
}

export interface AvatarHostProps {
  bridgeRef?: React.MutableRefObject<AvatarBridge | null>;
  onReady?: (level: AvatarLevel) => void;
  onError?: (code: string, message: string) => void;
  style?: object;
}
