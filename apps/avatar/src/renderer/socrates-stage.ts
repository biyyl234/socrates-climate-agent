/**
 * Socrates image stage (Canvas 2D).
 *
 * A high-quality illustrated Socrates portrait rendered as a single sprite,
 * with a procedural amplitude-driven mouth inside the beard, idle breathing /
 * sway, and state / gesture head motion. Canvas 2D is used on purpose: it has
 * no WebGL context-loss surface and runs identically over http(s) and file://,
 * so the character cannot silently disappear the way a GPU Live2D model can.
 *
 * The public method surface matches the shared renderer interface used by
 * AvatarApp, so the orchestrator only changes which class it instantiates.
 */
import type { AvatarState, ExpressionId, MotionId } from "@socrates/core";
import { SOCRATES_IMAGE_URL } from "../config";

interface PoseParams {
  headTilt: number;
  bodyLean: number;
  mouthForm: number;
}

const NEUTRAL: PoseParams = { headTilt: 0, bodyLean: 0, mouthForm: 0 };

/** Expression -> best-effort pose cues for a static illustration. */
const EXPRESSION_POSE: Record<ExpressionId, Partial<PoseParams>> = {
  "exp-neutral": {},
  "exp-smile": { mouthForm: 0.25 },
  "exp-listen": { bodyLean: 0.06 },
  "exp-think": { headTilt: 0.05 },
  "exp-affirm": { headTilt: -0.03, mouthForm: 0.2 },
  "exp-invite": { bodyLean: 0.04 },
  "exp-celebrate": { headTilt: -0.05, mouthForm: 0.3 },
  "exp-curious": { headTilt: 0.07 },
  "exp-apology": { headTilt: 0.04, bodyLean: -0.04 },
};

// Mouth location in normalized image coordinates (the portrait is a
// three-quarter view facing left; the mouth sits inside the grey beard).
const MOUTH_NX = 0.47;
const MOUTH_NY = 0.151;
const MOUTH_HALF_W = 0.028;
const MOUTH_HALF_H_MAX = 0.014;

export class SocratesStage {
  private readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private image: HTMLImageElement | null = null;

  private state: AvatarState = "Idle";
  private pose: PoseParams = { ...NEUTRAL };
  private mouthOpen = 0;

  private rafId: number | null = null;
  private gestureTimer: number | null = null;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
    this.ctx = this.canvas.getContext("2d");
    this.root.appendChild(this.canvas);
  }

  /** Load the portrait. Resolves false (so the app can degrade) on failure. */
  async init(): Promise<boolean> {
    try {
      const img = new Image();
      img.src = SOCRATES_IMAGE_URL;
      await img.decode();
      this.image = img;
      this.resize();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.root);
      this.startLoop();
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SocratesStage] image load failed", err);
      return false;
    }
  }

  // -- shared renderer interface --------------------------------------------

  setMouth(value: number): void {
    this.mouthOpen = Math.max(0, Math.min(1, value));
  }

  applyExpression(id: ExpressionId): void {
    const patch = EXPRESSION_POSE[id] ?? {};
    this.pose = { ...NEUTRAL, ...this.pose, ...patch };
  }

  applyStatePosture(state: AvatarState): void {
    this.state = state;
    switch (state) {
      case "Listening":
        this.pose.bodyLean = 0.07;
        break;
      case "Thinking":
        this.pose.headTilt = 0.05;
        break;
      case "Affirm":
      case "Celebrate":
        this.pose.bodyLean = -0.03;
        break;
      default:
        this.pose.bodyLean = 0;
        if (state !== "Speaking") this.pose.headTilt = 0;
    }
  }

  applyMotion(id: MotionId): void {
    if (this.gestureTimer !== null) {
      window.clearTimeout(this.gestureTimer);
      this.gestureTimer = null;
    }
    const start = performance.now();
    const duration = 650;
    const tick = (): void => {
      if (this.disposed) return;
      const t = (performance.now() - start) / duration;
      if (t >= 1) {
        this.pose.headTilt = 0;
        this.pose.bodyLean = 0;
        this.gestureTimer = null;
        return;
      }
      const wave = Math.sin(t * Math.PI);
      switch (id) {
        case "m-nod":
          this.pose.bodyLean = wave * 0.1;
          break;
        case "m-head-tilt":
        case "m-gentle-shake":
          this.pose.headTilt = wave * (id === "m-gentle-shake" ? 0.14 : 0.1);
          break;
        default:
          // Arm gestures are approximated with a small head raise on a static image.
          this.pose.bodyLean = -wave * 0.05;
      }
      this.gestureTimer = window.setTimeout(tick, 16);
    };
    tick();
  }

  resize(): void {
    const w = this.root.clientWidth || 1;
    const h = this.root.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // -- render loop -----------------------------------------------------------

  private startLoop(): void {
    if (this.rafId !== null || this.disposed) return;
    const loop = (): void => {
      if (!this.disposed) {
        this.draw();
        this.rafId = window.requestAnimationFrame(loop);
      }
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  private draw(): void {
    const ctx = this.ctx;
    const img = this.image;
    if (!ctx || !img) return;
    const W = this.root.clientWidth;
    const H = this.root.clientHeight;
    ctx.clearRect(0, 0, W, H);

    // Contain fit, biased to fill the full height so the character stays large.
    const margin = 0.01;
    const availH = H * (1 - margin * 2);
    let drawH = availH;
    let drawW = (drawH * img.naturalWidth) / img.naturalHeight;
    if (drawW > W) {
      drawW = W;
      drawH = (drawW * img.naturalHeight) / img.naturalWidth;
    }
    const now = performance.now() / 1000;
    const breathe = 1 + 0.012 * Math.sin(now * ((2 * Math.PI) / 3.6));
    const sway = 0.004 * Math.sin(now * ((2 * Math.PI) / 6.4));
    const tilt = this.pose.headTilt + sway;
    const leanX = this.pose.bodyLean * W * 0.02;

    // Pivot near the upper chest so head gestures read naturally.
    const px = W / 2;
    const py = H * 0.24;

    ctx.save();
    ctx.translate(px + leanX, py);
    ctx.rotate(tilt);
    ctx.scale(breathe, breathe);
    ctx.translate(-px, -py);

    const dx = px - drawW / 2;
    const dy = H - drawH - H * margin;
    ctx.drawImage(img, dx, dy, drawW, drawH);

    this.drawMouth(ctx, dx, dy, drawW, drawH);
    ctx.restore();
  }

  private drawMouth(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    drawW: number,
    drawH: number,
  ): void {
    if (this.mouthOpen <= 0.05) return;
    const cx = dx + MOUTH_NX * drawW;
    const cy = dy + MOUTH_NY * drawH;
    const open = this.mouthOpen;
    // Width eases toward the full lip width; height scales with the opening.
    const rx = MOUTH_HALF_W * drawW * (0.55 + 0.45 * open);
    const ry = MOUTH_HALF_H_MAX * drawH * open;

    ctx.save();
    // Thin lip rim, then a vertically shaded cavity so it reads as an opening.
    ctx.fillStyle = "rgba(128, 74, 62, 0.85)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.08, ry * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
    grad.addColorStop(0, "rgba(40, 18, 16, 0.97)");
    grad.addColorStop(0.55, "rgba(74, 34, 28, 0.95)");
    grad.addColorStop(1, "rgba(120, 66, 56, 0.9)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
    if (this.gestureTimer !== null) window.clearTimeout(this.gestureTimer);
    this.resizeObserver?.disconnect();
    this.canvas.remove();
  }
}
