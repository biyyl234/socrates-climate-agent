/**
 * Dependency-free Canvas fallback renderer, used for levels L2 / L3 / L4.
 *
 * - L2: a hand-drawn scholar bust with breathing and blink light motion.
 * - L3: a simplified geometric character with basic state cues.
 * - L4: no character at all; a DOM text bubble carries the utterance.
 *
 * This renderer guarantees the page never shows a blank white canvas if the
 * Live2D model / WebGL runtime fails to load (§2.8.7).
 */
import type { AvatarState, ExpressionId, MotionId } from "@socrates/core";

interface FaceParams {
  eyeOpen: number;
  browY: number;
  browForm: number;
  mouthOpen: number;
  mouthForm: number;
  headTilt: number;
  bodyLean: number;
}

const NEUTRAL: FaceParams = {
  eyeOpen: 1,
  browY: 0,
  browForm: 0,
  mouthOpen: 0,
  mouthForm: 0,
  headTilt: 0,
  bodyLean: 0,
};

const EXPRESSION_FACE: Record<ExpressionId, Partial<FaceParams>> = {
  "exp-neutral": {},
  "exp-smile": { eyeOpen: 0.72, browY: 0.12, mouthForm: 0.35 },
  "exp-listen": { eyeOpen: 1, browY: 0.1, bodyLean: 0.08 },
  "exp-think": { browY: -0.18, browForm: -0.6, headTilt: 0.06 },
  "exp-affirm": { eyeOpen: 0.78, browY: 0.1, mouthForm: 0.3 },
  "exp-invite": { eyeOpen: 0.95, browY: 0.08, mouthForm: 0.1 },
  "exp-celebrate": { mouthOpen: 0.55, eyeOpen: 0.6, browY: 0.15, mouthForm: 0.2 },
  "exp-curious": { eyeOpen: 1.1, browY: 0.18, headTilt: 0.08 },
  "exp-apology": { mouthForm: -0.5, browY: -0.12, bodyLean: -0.05 },
};

const COLORS = {
  skin: "#EAC9A6",
  skinShadow: "#D9AE87",
  hair: "#463830",
  robe: "#2F5D50",
  robeSoft: "#3E7165",
  scarf: "#C97B5A",
  eye: "#1F2A26",
  bg: "transparent",
};

export class CanvasFallback {
  private readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private overlay: HTMLDivElement;

  private level: 2 | 3 | 4 = 2;
  private state: AvatarState = "Idle";
  private face: FaceParams = { ...NEUTRAL };

  private rafId: number | null = null;
  private blinkTimer: number;
  private gestureTimer: number | null = null;
  private disposed = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.overlay = document.createElement("div");
    this.overlay.className = "avatar-text-bubble";
    this.overlay.hidden = true;
    this.root.appendChild(this.canvas);
    this.root.appendChild(this.overlay);
    this.blinkTimer = this.nextBlink();
    this.resize();
  }

  setLevel(level: 2 | 3 | 4): void {
    this.level = level;
    this.overlay.hidden = level !== 4;
    if (level === 4) {
      this.canvas.style.display = "none";
    } else {
      this.canvas.style.display = "block";
      this.startLoop();
    }
  }

  setState(state: AvatarState): void {
    this.state = state;
    switch (state) {
      case "Listening":
        this.face.bodyLean = 0.1;
        break;
      case "Thinking":
        this.face.headTilt = 0.08;
        break;
      case "Affirm":
      case "Celebrate":
        this.face.bodyLean = -0.04;
        break;
      default:
        this.face.bodyLean = 0;
        this.face.headTilt = 0;
    }
  }

  setExpression(id: ExpressionId): void {
    const patch = EXPRESSION_FACE[id] ?? {};
    this.face = { ...NEUTRAL, ...this.face, ...patch };
  }

  /** Adapter matching the shared renderer interface. */
  applyExpression(id: ExpressionId): void {
    this.setExpression(id);
  }

  /** Adapter matching the shared renderer interface. */
  applyStatePosture(state: AvatarState): void {
    this.setState(state);
  }

  setMouth(value: number): void {
    this.face.mouthOpen = Math.max(0, Math.min(1, value));
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
        this.face.headTilt = 0;
        this.face.bodyLean = 0;
        this.gestureTimer = null;
        return;
      }
      const wave = Math.sin(t * Math.PI);
      switch (id) {
        case "m-nod":
          this.face.bodyLean = wave * 0.12;
          break;
        case "m-head-tilt":
          this.face.headTilt = wave * 0.12;
          break;
        case "m-gentle-shake":
          this.face.headTilt = wave * 0.16;
          break;
        default:
          // Arm gestures (point / palm / raise hand) are approximated with a
          // small head raise; the fallback layer has no arm skeleton.
          this.face.bodyLean = -wave * 0.06;
      }
      this.gestureTimer = window.setTimeout(tick, 16);
    };
    tick();
  }

  setOverlayText(text: string): void {
    this.overlay.textContent = text;
  }

  resize(): void {
    const w = this.root.clientWidth || 1;
    const h = this.root.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private nextBlink(): number {
    return 3000 + Math.random() * 3000;
  }

  private startLoop(): void {
    if (this.rafId !== null || this.disposed) return;
    const loop = (): void => {
      if (this.disposed) return;
      this.updateBlink();
      this.draw();
      this.rafId = window.requestAnimationFrame(loop);
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  private updateBlink(): void {
    this.blinkTimer -= 16;
    if (this.blinkTimer <= 0) {
      this.face.eyeOpen = 0.08;
      this.blinkTimer = this.nextBlink();
      window.setTimeout(() => {
        if (!this.disposed) this.face.eyeOpen = 1;
      }, 130);
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const breathe = 1 + 0.015 * Math.sin((performance.now() / 1000) * ((2 * Math.PI) / 3.6));
    const cx = w / 2;
    const cy = h * 0.56;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.face.headTilt);
    ctx.scale(breathe, breathe);
    ctx.translate(-cx, -cy);

    if (this.level === 3) {
      this.drawSimplified(ctx, cx, cy, w, h);
    } else {
      this.drawBust(ctx, cx, cy, w, h);
    }
    ctx.restore();
  }

  private drawBust(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
    const headR = Math.min(w, h) * 0.18;
    // Robe / shoulders.
    ctx.fillStyle = COLORS.robe;
    ctx.beginPath();
    ctx.moveTo(cx - headR * 1.7, cy + headR * 1.7);
    ctx.quadraticCurveTo(cx, cy + headR * 0.7, cx + headR * 1.7, cy + headR * 1.7);
    ctx.lineTo(cx + headR * 1.7, cy + headR * 2.2);
    ctx.lineTo(cx - headR * 1.7, cy + headR * 2.2);
    ctx.closePath();
    ctx.fill();

    // Scarf.
    ctx.fillStyle = COLORS.scarf;
    ctx.fillRect(cx - headR * 0.55, cy + headR * 0.95, headR * 1.1, headR * 0.35);

    // Neck.
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(cx - headR * 0.35, cy + headR * 0.55, headR * 0.7, headR * 0.55);

    // Head.
    ctx.fillStyle = COLORS.skin;
    ctx.beginPath();
    ctx.ellipse(cx, cy - headR * 0.15, headR, headR * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair top / back.
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - headR * 0.35, headR * 0.98, headR * 0.85, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();

    // Eyes.
    const eyeY = cy - headR * 0.1;
    const eyeDX = headR * 0.42;
    const eyeOpen = Math.max(0.06, this.face.eyeOpen);
    for (const side of [-1, 1]) {
      ctx.fillStyle = COLORS.eye;
      ctx.beginPath();
      ctx.ellipse(cx + side * eyeDX, eyeY, headR * 0.11, headR * 0.12 * eyeOpen, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Brows.
    ctx.strokeStyle = COLORS.hair;
    ctx.lineWidth = headR * 0.07;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      const browY = eyeY - headR * 0.22 - this.face.browY * headR * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx + side * eyeDX - headR * 0.14, browY);
      ctx.lineTo(cx + side * eyeDX + headR * 0.14, browY + this.face.browForm * headR * 0.05);
      ctx.stroke();
    }

    // Mouth.
    const mouthY = cy + headR * 0.38;
    ctx.strokeStyle = "#8A4B3E";
    ctx.lineWidth = headR * 0.06;
    if (this.face.mouthOpen > 0.08) {
      ctx.fillStyle = "#8A4B3E";
      ctx.beginPath();
      ctx.ellipse(cx, mouthY, headR * 0.16, headR * 0.14 * this.face.mouthOpen, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - headR * 0.14, mouthY);
      ctx.quadraticCurveTo(cx, mouthY + this.face.mouthForm * headR * 0.06, cx + headR * 0.14, mouthY);
      ctx.stroke();
    }
  }

  private drawSimplified(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
    const headR = Math.min(w, h) * 0.2;
    // Body block.
    ctx.fillStyle = COLORS.robeSoft;
    ctx.beginPath();
    ctx.roundRect(cx - headR * 1.1, cy + headR * 0.6, headR * 2.2, headR * 1.6, headR * 0.4);
    ctx.fill();
    // Head.
    ctx.fillStyle = COLORS.skin;
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI * 2);
    ctx.fill();
    // Hair cap.
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath();
    ctx.arc(cx, cy - headR * 0.25, headR * 0.9, Math.PI, Math.PI * 2);
    ctx.fill();
    // Dot eyes.
    const eyeOpen = Math.max(0.1, this.face.eyeOpen);
    ctx.fillStyle = COLORS.eye;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * headR * 0.35, cy, headR * 0.1, headR * 0.12 * eyeOpen, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Line mouth.
    ctx.strokeStyle = "#8A4B3E";
    ctx.lineWidth = headR * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.18, cy + headR * 0.35);
    ctx.lineTo(cx + headR * 0.18, cy + headR * 0.35);
    ctx.stroke();
  }

  dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
    if (this.gestureTimer !== null) window.clearTimeout(this.gestureTimer);
    this.overlay.remove();
    this.canvas.remove();
  }
}
