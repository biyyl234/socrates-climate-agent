/**
 * Avatar orchestrator: owns the renderer stack, audio, state machine and the
 * postMessage bridge. All other modules are called through high-level methods.
 */
import type {
  AppToAvatar,
  AvatarCapabilities,
  AvatarLevel,
  AvatarState,
  ExpressionId,
  MotionId,
} from "@socrates/core";
import { ProtocolBridge } from "./protocol-bridge";
import { AudioManager, type AudioPlayResult } from "./audio/audio-manager";
import { StateMachine } from "./state/state-machine";
import { Live2DStage } from "./renderer/live2d-stage";
import { CanvasFallback } from "./renderer/canvas-fallback";
import { STATE_EXPRESSION, capabilitiesForLevel } from "./config";

interface ActiveRenderer {
  setMouth(value: number): void;
  applyExpression(id: ExpressionId): void;
  applyMotion(id: MotionId): void;
  applyStatePosture(state: AvatarState): void;
  dispose(): void;
}

const STATE_HOLD_MS: Partial<Record<AvatarState, number>> = {
  Thinking: 1000,
  Affirm: 1000,
  Celebrate: 1400,
};

export class AvatarApp {
  private readonly root: HTMLElement;
  private readonly bridge = new ProtocolBridge();
  private readonly audio = new AudioManager();
  private readonly machine = new StateMachine();

  private live2d: Live2DStage | null = null;
  private fallback: CanvasFallback | null = null;
  private renderer: ActiveRenderer | null = null;

  private level: AvatarLevel = 0;
  private theme: "light" | "dark" = "light";
  private locale = "zh-CN";

  private speaking = false;
  private currentUtteranceId: string | null = null;
  private utteranceEndTimer: number | null = null;

  private fpsFrames = 0;
  private fps = 0;
  private mouth = 0;
  private metricsTimer: number | null = null;
  private booted = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.dataset.theme = this.theme;
  }

  /** Boot the bridge, unlock listeners and the default renderer. */
  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;

    this.bridge.start();
    this.bridge.onIncoming((env) => this.handle(env));

    // §2.8.6: unlock the AudioContext on the first user gesture.
    const unlock = (): void => {
      this.audio.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    this.machine.onChange(({ to }) => this.onStateChange(to));

    await this.ensureRenderer(this.level);
    this.startMetrics();
    this.bridge.send({ type: "ready", payload: { capabilities: this.capabilities(), level: this.level } });
  }

  // ---------------------------------------------------------------------------
  // Protocol dispatch
  // ---------------------------------------------------------------------------

  private handle(env: { type: AppToAvatar["type"]; payload: AppToAvatar["payload"] }): void {
    switch (env.type) {
      case "init":
        this.onInit(env.payload as { level: AvatarLevel; theme: "light" | "dark"; locale: string });
        break;
      case "speak":
        void this.onSpeak(
          env.payload as { utteranceId: string; text: string; audioUrl?: string | null },
        );
        break;
      case "stop_speak":
        this.onStopSpeak();
        break;
      case "set_state":
        this.onSetState((env.payload as { state: AvatarState }).state);
        break;
      case "expression":
        this.onExpression((env.payload as { expressionId: ExpressionId }).expressionId);
        break;
      case "motion":
        this.onMotion((env.payload as { motionId: MotionId }).motionId);
        break;
      case "set_level":
        void this.onSetLevel((env.payload as { level: AvatarLevel }).level, "command");
        break;
      case "set_tts":
        this.audio.setTtsEnabled((env.payload as { enabled: boolean }).enabled);
        break;
      default:
        // Unknown message types are ignored per the frozen protocol.
        break;
    }
  }

  private onInit(payload: { level: AvatarLevel; theme: "light" | "dark"; locale: string }): void {
    this.theme = payload.theme;
    this.locale = payload.locale;
    this.root.dataset.theme = this.theme;
    void this.onSetLevel(payload.level, "init");
  }

  private async onSetLevel(level: AvatarLevel, reason: string): Promise<void> {
    if (this.level === level && this.renderer) {
      this.bridge.send({ type: "level_changed", payload: { level, reason } });
      return;
    }
    this.level = level;
    await this.ensureRenderer(level);
    this.bridge.send({ type: "level_changed", payload: { level, reason } });
  }

  // ---------------------------------------------------------------------------
  // Renderer stack with L0 -> L4 degradation
  // ---------------------------------------------------------------------------

  private async ensureRenderer(level: AvatarLevel): Promise<void> {
    this.teardownRenderer();

    if (level === 0 || level === 1) {
      const stage = new Live2DStage(this.root);
      this.live2d = stage;
      stage.onRecovered = (recovered, err) => {
        if (recovered) return;
        // Only a post-loss rebuild that cannot come back up falls through;
        // transient per-frame/audio errors do not reach this path.
        this.reportError(
          "MODEL_RECOVERY_FAILED",
          err?.message ?? "Live2D engine did not recover after context loss",
          false,
        );
        this.teardownRenderer();
        this.ensureCanvas(2);
      };
      const ok = await stage.init();
      if (ok) {
        this.renderer = stage;
        stage.onHit = (area, x, y) => {
          this.bridge.send({ type: "hit", payload: { hitArea: area, x, y } });
        };
        return;
      }
      // Live2D failed: record the fault and fall through to the Canvas layer.
      this.reportError("MODEL_LOAD_FAILED", stage.error?.message ?? "Live2D model failed to load", true);
      this.live2d = null;
      return this.ensureCanvas(2);
    }
    return this.ensureCanvas(level as 2 | 3 | 4);
  }

  private ensureCanvas(level: 2 | 3 | 4): void {
    try {
      const canvas = new CanvasFallback(this.root);
      canvas.setLevel(level);
      this.fallback = canvas;
      this.renderer = canvas;
    } catch (err) {
      // Last-resort L4: DOM bubble only, no drawing surface at all.
      this.reportError(
        "CANVAS_UNAVAILABLE",
        err instanceof Error ? err.message : String(err),
        false,
      );
      this.fallback = null;
      this.renderer = null;
    }
  }

  private teardownRenderer(): void {
    this.renderer = null;
    this.live2d?.dispose();
    this.live2d = null;
    this.fallback?.dispose();
    this.fallback = null;
  }

  private capabilities(): AvatarCapabilities {
    return capabilitiesForLevel(this.level);
  }

  // ---------------------------------------------------------------------------
  // State / expression / motion
  // ---------------------------------------------------------------------------

  private onStateChange(state: AvatarState): void {
    this.guardRenderer(() => this.renderer?.applyStatePosture(state));
    this.onExpression(STATE_EXPRESSION[state]);
  }

  private onSetState(state: AvatarState): void {
    this.machine.enter(state, STATE_HOLD_MS[state]);
  }

  private onExpression(id: ExpressionId): void {
    this.guardRenderer(() => this.renderer?.applyExpression(id));
  }

  private onMotion(id: MotionId): void {
    this.guardRenderer(() => this.renderer?.applyMotion(id));
  }

  /**
   * Isolate renderer-side errors so one bad expression/motion/posture call
   * cannot take down the bridge or the render loop. Recoverable by design.
   */
  private guardRenderer(action: () => void): void {
    try {
      action();
    } catch (err) {
      this.reportError(
        "RENDERER_TRANSIENT",
        err instanceof Error ? err.message : String(err),
        true,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Utterance lifecycle
  // ---------------------------------------------------------------------------

  private async onSpeak(payload: {
    utteranceId: string;
    text: string;
    audioUrl?: string | null;
  }): Promise<void> {
    this.stopUtteranceTimer();
    this.speaking = true;
    this.currentUtteranceId = payload.utteranceId;
    this.fallback?.setOverlayText(payload.text);
    this.bridge.send({ type: "speak_started", payload: { utteranceId: payload.utteranceId } });

    const caps = this.capabilities();
    let result: AudioPlayResult;
    if (payload.audioUrl && caps.tts && this.audio.ttsAllowed) {
      result = await this.audio.playAudio(payload.audioUrl);
    } else {
      const duration = this.audio.startFallbackUtterance(payload.text);
      this.utteranceEndTimer = window.setTimeout(
        () => this.finishUtterance({ status: "ended" }),
        duration * 1000,
      );
      return;
    }
    this.finishUtterance(result);
  }

  private finishUtterance(result: AudioPlayResult): void {
    this.speaking = false;
    const id = this.currentUtteranceId;
    this.currentUtteranceId = null;
    if (id) {
      this.bridge.send({ type: "speak_ended", payload: { utteranceId: id } });
    }
    if (result.status === "error") {
      this.reportError(result.code, result.message, true);
    }
  }

  private onStopSpeak(): void {
    this.audio.stop();
    if (this.utteranceEndTimer !== null) {
      window.clearTimeout(this.utteranceEndTimer);
      this.utteranceEndTimer = null;
    }
    if (this.speaking) {
      this.finishUtterance({ status: "stopped" });
    }
  }

  private stopUtteranceTimer(): void {
    if (this.utteranceEndTimer !== null) {
      window.clearTimeout(this.utteranceEndTimer);
      this.utteranceEndTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Per-frame mouth amplitude + metrics
  // ---------------------------------------------------------------------------

  private startMetrics(): void {
    let last = performance.now();
    const frame = (): void => {
      try {
        // Mouth amplitude: analyser RMS or fallback envelope, with attack/release smoothing.
        const target = this.speaking ? this.audio.currentAmplitude() : 0;
        const attack = target > this.mouth ? 0.35 : 0.16;
        this.mouth += (target - this.mouth) * attack;
        if (this.mouth < 0.02) this.mouth = 0;
        this.guardRenderer(() => this.renderer?.setMouth(this.mouth));

        this.fpsFrames += 1;
        const now = performance.now();
        if (now - last >= 1000) {
          this.fps = Math.round((this.fpsFrames * 1000) / (now - last));
          this.fpsFrames = 0;
          last = now;
        }
      } catch (err) {
        this.reportError(
          "FRAME_TRANSIENT",
          err instanceof Error ? err.message : String(err),
          true,
        );
      } finally {
        // Never let one bad frame break the 16 ms scheduling chain.
        this.metricsTimer = window.setTimeout(frame, 16);
      }
    };
    frame();
  }

  private reportError(code: string, message: string, recoverable: boolean): void {
    this.bridge.send({ type: "error", payload: { code, message, recoverable } });
  }

  /** Current metrics for tests / diagnostics. */
  get metrics(): { fps: number; level: AvatarLevel; speaking: boolean } {
    return { fps: this.fps, level: this.level, speaking: this.speaking };
  }

  dispose(): void {
    this.stopUtteranceTimer();
    if (this.metricsTimer !== null) window.clearTimeout(this.metricsTimer);
    this.audio.release();
    this.teardownRenderer();
  }
}
