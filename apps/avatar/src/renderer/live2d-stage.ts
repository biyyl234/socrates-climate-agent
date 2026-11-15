/**
 * Live2D rendering stage: PixiJS v8 Application + a single Live2D model.
 *
 * All engine-specific surface area lives here. The rest of the bundle talks to
 * this stage through high-level methods (expression / motion / mouth / posture),
 * so the plugin can be swapped without touching protocol or app orchestration.
 */
import { Application, Ticker, type Container } from "pixi.js";
import {
  Live2DModel,
  MotionPriority,
  type Live2DFactoryOptions,
} from "@jannchie/pixi-live2d-display/cubism4";
import type { ExpressionId, MotionId, AvatarState } from "@socrates/core";
import { EXPRESSION_TO_FILE, MODEL_URL, MOTION_GROUP } from "../config";

export type HitHandler = (hitArea: string, x: number, y: number) => void;

/** Recovery callback after a context-lost rebuild. `ok` is false only when the engine cannot come back up. */
export type RecoveryHandler = (ok: boolean, error: Error | null) => void;

export class Live2DStage {
  private app: Application | null = null;
  private model: Live2DModel | null = null;
  private root: HTMLElement;
  private disposed = false;
  private loadError: Error | null = null;
  private gestureTimer: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private contextLost = false;
  private lastState: AvatarState | null = null;
  private lastExpression: ExpressionId | null = null;
  private contextLostHandler: ((e: Event) => void) | null = null;
  private contextRestoredHandler: (() => void) | null = null;

  onHit: HitHandler | null = null;
  /** Invoked after a context-loss rebuild. Registered by the app orchestrator. */
  onRecovered: RecoveryHandler | null = null;

  private handleWindowResize = (): void => {
    this.resize();
  };

  constructor(root: HTMLElement) {
    this.root = root;
  }

  /** Whether the Cubism core global was present before model load. */
  private coreAvailable(): boolean {
    return typeof (window as { Live2DCubismCore?: unknown }).Live2DCubismCore !== "undefined";
  }

  /**
   * Initialize the Pixi application and load the model.
   * Resolves true on success; sets `loadError` and resolves false otherwise.
   */
  async init(): Promise<boolean> {
    if (!this.coreAvailable()) {
      this.loadError = new Error("Live2DCubismCore runtime is not loaded");
      return false;
    }
    return this.createEngine();
  }

  /**
   * Create the Pixi application, load the model and wire listeners. Split from
   * `init` so a recovered GL context can rebuild the whole engine in place.
   */
  private async createEngine(): Promise<boolean> {
    try {
      this.loadError = null;
      const app = new Application();
      await app.init({
        canvas: document.createElement("canvas"),
        resizeTo: this.root,
        backgroundAlpha: 0,
        antialias: true,
        autoStart: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });
      this.app = app;
      this.root.appendChild(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      this.wireContextEvents(app);

      const options: Live2DFactoryOptions = {
        ticker: Ticker.shared,
        autoHitTest: true,
        autoFocus: false,
        onError: (e: Error) => {
          this.loadError = e;
        },
      };
      const model = await Live2DModel.from(MODEL_URL, options);
      this.model = model;

      app.stage.addChild(model);
      this.fitModel(model);
      // Model bounds settle after the first layout frame; refit once more so a
      // rebuilt engine keeps the same contain scale as the initial mount.
      requestAnimationFrame(() => {
        if (this.model === model) this.fitModel(model);
      });

      // Restore the last cues after a rebuild so the recovered avatar matches
      // the pre-loss state instead of dropping back to the neutral pose.
      if (this.lastState) this.applyStatePosture(this.lastState);
      if (this.lastExpression) this.applyExpression(this.lastExpression);

      // Re-fit the model whenever the host container resizes (WebView/iframe
      // size, orientation/wide switch, keyboard inset). Pixi's resizeTo only
      // resizes the canvas; the model scale/anchor need this re-fit.
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.root);
      } else {
        window.addEventListener("resize", this.handleWindowResize);
      }

      model.on("hit", (areas: string[]) => {
        const area = areas[0] ?? "Body";
        if (this.onHit) this.onHit(area, 0, 0);
      });

      return this.loadError === null;
    } catch (err) {
      this.loadError = err instanceof Error ? err : new Error(String(err));
      return false;
    }
  }

  /**
   * Raw canvas GL context events plus the Pixi v8 renderer events (when the
   * renderer exposes an EventEmitter). `preventDefault` on loss keeps the
   * context eligible to be restored; we then rebuild the engine in place.
   */
  private wireContextEvents(app: Application): void {
    const canvas = app.canvas;
    this.contextLostHandler = (event: Event) => {
      event.preventDefault();
      this.contextLost = true;
    };
    this.contextRestoredHandler = () => {
      this.contextLost = false;
      void this.rebuild();
    };
    canvas.addEventListener("webglcontextlost", this.contextLostHandler);
    canvas.addEventListener("webglcontextrestored", this.contextRestoredHandler);

    const renderer = app.renderer as unknown as {
      on?: (event: string, handler: () => void) => void;
    };
    if (renderer && typeof renderer.on === "function") {
      renderer.on("contextLost", this.contextLostHandler as () => void);
      renderer.on("contextRestored", this.contextRestoredHandler);
    }
  }

  /** Tear down the current engine without touching the root container. */
  private teardownEngine(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener("resize", this.handleWindowResize);
    if (this.gestureTimer !== null) {
      window.clearTimeout(this.gestureTimer);
      this.gestureTimer = null;
    }
    if (this.model) {
      this.model.destroy({ children: true });
      this.model = null;
    }
    if (this.app) {
      this.app.destroy({ removeView: true }, { children: true, texture: false });
      this.app = null;
    }
  }

  /** Rebuild after a GL context was lost and restored; non-manual recovery. */
  private async rebuild(): Promise<void> {
    if (this.disposed) return;
    this.teardownEngine();
    const ok = await this.createEngine();
    this.onRecovered?.(ok, this.loadError);
  }

  get ready(): boolean {
    return this.model !== null && this.loadError === null;
  }

  get error(): Error | null {
    return this.loadError;
  }

  private fitModel(model: Live2DModel): void {
    const parent = this.root;
    const pw = parent.clientWidth || 1;
    const ph = parent.clientHeight || 1;
    const mw = model.width || 1;
    const mh = model.height || 1;
    const scale = Math.min(pw / mw, ph / mh) * 0.92;
    model.scale.set(scale, scale);
    model.anchor.set(0.5, 0.5);
    model.x = pw / 2;
    model.y = ph / 2 + ph * 0.04;
  }

  /** Apply a protocol expression to the model. */
  applyExpression(id: ExpressionId): void {
    this.lastExpression = id;
    if (!this.model) return;
    const file = EXPRESSION_TO_FILE[id];
    void this.model.expression(file).catch(() => undefined);
  }

  /** Apply a protocol motion; unsupported gestures fall back to head parameters. */
  applyMotion(id: MotionId): void {
    if (!this.model) return;
    const group = MOTION_GROUP[id];
    if (group) {
      void this.model.motion(group, undefined, MotionPriority.NORMAL).catch(() => undefined);
      return;
    }
    this.runHeadGesture(id);
  }

  /**
   * Approximate head-only gestures that the Haru model has no arm / motion group
   * for: tilt and gentle shake. Nod uses the TapBody motion group instead.
   */
  private runHeadGesture(id: MotionId): void {
    if (!this.model) return;
    if (this.gestureTimer !== null) {
      window.clearTimeout(this.gestureTimer);
      this.gestureTimer = null;
    }
    const paramX = "ParamFaceAngleX";
    const paramY = "ParamFaceAngleY";
    const start = performance.now();
    const duration = id === "m-head-tilt" ? 650 : 600;
    const tick = (): void => {
      if (!this.model) return;
      try {
        const t = (performance.now() - start) / duration;
        if (t >= 1) {
          this.model.setParameterValue(paramX, 0);
          this.model.setParameterValue(paramY, 0);
          this.gestureTimer = null;
          return;
        }
        const wave = Math.sin(t * Math.PI);
        if (id === "m-head-tilt") {
          this.model.setParameterValue(paramY, wave * 0.25);
        } else {
          this.model.setParameterValue(paramX, wave * 0.18);
        }
      } catch {
        // A transient parameter/parameter-store error must not kill the gesture timer.
      }
      this.gestureTimer = window.setTimeout(tick, 16);
    };
    tick();
  }

  /** Mouth openness in [0, 1], written through the plugin lip-sync channel. */
  setMouth(value: number): void {
    if (!this.model) return;
    this.model.setLipSyncValue(Math.max(0, Math.min(1, value)));
  }

  /** Light posture per state: listening leans in, thinking tilts slightly. */
  applyStatePosture(state: AvatarState): void {
    this.lastState = state;
    if (!this.model) return;
    const body = "ParamBodyAngleX";
    switch (state) {
      case "Listening":
        this.model.setParameterValue(body, 0.12);
        break;
      case "Thinking":
        this.model.setParameterValue(body, 0.05);
        this.model.setParameterValue("ParamFaceAngleY", 0.1);
        break;
      case "Speaking":
      case "Affirm":
      case "Celebrate":
      case "Idle":
      case "Fallback":
        this.model.setParameterValue(body, 0);
        this.model.setParameterValue("ParamFaceAngleY", 0);
        break;
    }
  }

  resize(): void {
    if (this.disposed || !this.app || !this.model) return;
    this.fitModel(this.model);
  }

  dispose(): void {
    this.disposed = true;
    if (this.app && this.contextLostHandler) {
      this.app.canvas.removeEventListener("webglcontextlost", this.contextLostHandler);
      this.app.canvas.removeEventListener("webglcontextrestored", this.contextRestoredHandler!);
    }
    this.contextLostHandler = null;
    this.contextRestoredHandler = null;
    this.teardownEngine();
  }
}

// Re-exported to satisfy bundler tree-shaking of the Container type usage above.
export type { Container };
