/**
 * Audio lifecycle for the avatar:
 *
 * - Lazy AudioContext that only resumes after a user gesture (§2.8.6 mobile
 *   autoplay policy).
 * - TTS audio playback through an HTMLAudioElement + MediaElementSource ->
 *   AnalyserNode; per-frame RMS amplitude feeds the mouth parameter.
 * - Text-rhythm fallback envelope when there is no audio URL (or audio is
 *   muted): mouth opens in periodic gates with a pace estimated from length.
 *
 * This module intentionally has no viseme dependency; amplitude lip sync is the
 * cross-platform baseline described in §2.8.4-B.
 */
import {
  FALLBACK_CHARS_PER_SECOND,
  FALLBACK_MAX_SECONDS,
  FALLBACK_MIN_SECONDS,
} from "../config";

export type AudioPlayResult =
  | { status: "ended" }
  | { status: "stopped" }
  | { status: "error"; code: string; message: string };

export class AudioManager {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private element: HTMLAudioElement | null = null;

  private ttsEnabled = true;
  private unlocked = false;
  private analyserConnected = false;

  // Text-rhythm fallback state.
  private fallbackStart = 0;
  private fallbackDuration = 0;
  private fallbackActive = false;

  private readonly timeDomain = new Uint8Array(1024);

  /** Whether TTS audio is allowed to play (set by the `set_tts` command). */
  get ttsAllowed(): boolean {
    return this.ttsEnabled;
  }

  setTtsEnabled(enabled: boolean): void {
    this.ttsEnabled = enabled;
    if (!enabled) this.stop();
  }

  /**
   * Create or resume the AudioContext. Must be called from a user gesture at
   * least once on mobile; safe to call again afterwards.
   * @returns true if the context is running after this call.
   */
  unlock(): boolean {
    if (!this.context) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;
      this.context = new Ctor();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.55;
    }
    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => undefined);
    }
    this.unlocked = this.context.state === "running";
    return this.unlocked;
  }

  /** Is there a running AudioContext that has been unlocked by a gesture? */
  get isUnlocked(): boolean {
    return this.unlocked && this.context !== null && this.context.state === "running";
  }

  /**
   * Play a TTS audio URL. Resolves when playback ends, is stopped, or fails.
   * The analyser amplitude is then read through `currentAmplitude()`.
   */
  async playAudio(url: string): Promise<AudioPlayResult> {
    this.stop();
    if (!this.unlock()) {
      return { status: "error", code: "AUDIO_LOCKED", message: "AudioContext not unlocked by a user gesture" };
    }
    if (!this.context || !this.analyser) {
      return { status: "error", code: "AUDIO_UNAVAILABLE", message: "Web Audio is not supported" };
    }

    const element = new Audio();
    element.src = url;
    element.crossOrigin = "anonymous";
    element.preload = "auto";

    try {
      // Reuse one MediaElementSource per element; disconnect any previous graph.
      this.mediaSource?.disconnect();
      this.mediaSource = this.context.createMediaElementSource(element);
      this.mediaSource.connect(this.analyser);
      // Connect analyser -> destination only once; repeated connect() would
      // stack extra output connections and grow the audio graph per utterance.
      if (!this.analyserConnected) {
        this.analyser.connect(this.context.destination);
        this.analyserConnected = true;
      }

      this.element = element;
      await element.play();
      await new Promise<void>((resolve) => {
        element.onended = () => resolve();
        element.onerror = () => resolve();
      });
      return { status: "ended" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: "error", code: "AUDIO_PLAY_FAILED", message };
    } finally {
      this.element = null;
    }
  }

  /**
   * Start a text-rhythm fallback utterance with no audio. The mouth amplitude
   * follows a periodic gate; call `currentAmplitude()` per frame.
   * @returns estimated duration in seconds.
   */
  startFallbackUtterance(text: string): number {
    this.stopFallback();
    const seconds = Math.min(
      FALLBACK_MAX_SECONDS,
      Math.max(FALLBACK_MIN_SECONDS, text.length / FALLBACK_CHARS_PER_SECOND),
    );
    this.fallbackDuration = seconds * 1000;
    this.fallbackStart = performance.now();
    this.fallbackActive = true;
    return seconds;
  }

  stopFallback(): void {
    this.fallbackActive = false;
  }

  /** Whether the fallback utterance has finished. */
  get fallbackFinished(): boolean {
    return !this.fallbackActive;
  }

  /**
   * Current mouth amplitude in [0, 1]: RMS of the current PCM frame when audio
   * plays, otherwise the scheduled fallback envelope, otherwise 0.
   */
  currentAmplitude(): number {
    if (this.element && this.analyser) {
      this.analyser.getByteTimeDomainData(this.timeDomain);
      let sum = 0;
      for (let i = 0; i < this.timeDomain.length; i += 1) {
        const v = (this.timeDomain[i]! - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.timeDomain.length);
      return Math.min(1, rms * 2.4);
    }
    if (this.fallbackActive) {
      const elapsed = performance.now() - this.fallbackStart;
      if (elapsed >= this.fallbackDuration) {
        this.fallbackActive = false;
        return 0;
      }
      // Gate: 180 ms on, 120 ms off; a small breath-like jitter on amplitude.
      const cycle = elapsed % 300;
      if (cycle > 180) return 0;
      const wave = Math.sin((cycle / 180) * Math.PI);
      return 0.35 + 0.35 * wave;
    }
    return 0;
  }

  /** Stop audio and clear any fallback utterance. */
  stop(): void {
    if (this.element) {
      this.element.onended = null;
      this.element.onerror = null;
      this.element.pause();
      this.element.src = "";
      this.element = null;
    }
    this.mediaSource?.disconnect();
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyserConnected = false;
    }
    this.stopFallback();
  }

  release(): void {
    this.stop();
    if (this.context && this.context.state !== "closed") {
      void this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.analyser = null;
    this.mediaSource = null;
    this.analyserConnected = false;
  }
}
