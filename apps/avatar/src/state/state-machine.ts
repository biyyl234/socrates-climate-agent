/**
 * Animation state machine (§2.7.3).
 *
 * States: Idle, Listening, Thinking, Speaking, Affirm, Celebrate, Fallback.
 *
 * Switching rule — "queue + interrupt":
 * - An incoming state first ends the current gesture (pending timers are
 *   cancelled); long motions are never stacked on top of each other.
 * - Timed states (Thinking, Affirm, Celebrate) return to Idle on expiry unless
 *   another state has replaced them in the meantime.
 * - Speaking owns the mouth and keeps running until the utterance ends.
 */
import type { AvatarState } from "@socrates/core";

export interface StateChange {
  from: AvatarState;
  to: AvatarState;
}

type Listener = (change: StateChange) => void;

export class StateMachine {
  private current: AvatarState = "Idle";
  private returnTimer: number | null = null;
  private readonly listeners = new Set<Listener>();

  get state(): AvatarState {
    return this.current;
  }

  onChange(listener: Listener): void {
    this.listeners.add(listener);
  }

  /**
   * Enter a state, interrupting whatever gesture was pending.
   * @param state target state
   * @param holdMs optional duration after which a non-speaking state returns to Idle
   */
  enter(state: AvatarState, holdMs?: number): void {
    if (this.returnTimer !== null) {
      window.clearTimeout(this.returnTimer);
      this.returnTimer = null;
    }
    if (state === this.current) return;

    const from = this.current;
    this.current = state;
    this.notify({ from, to: state });

    if (holdMs !== undefined && state !== "Speaking" && state !== "Idle") {
      this.returnTimer = window.setTimeout(() => {
        this.returnTimer = null;
        this.enter("Idle");
      }, holdMs);
    }
  }

  /** Force back to Idle, cancelling any pending return. */
  reset(): void {
    if (this.returnTimer !== null) {
      window.clearTimeout(this.returnTimer);
      this.returnTimer = null;
    }
    if (this.current !== "Idle") {
      const from = this.current;
      this.current = "Idle";
      this.notify({ from, to: "Idle" });
    }
  }

  private notify(change: StateChange): void {
    for (const listener of this.listeners) listener(change);
  }
}
