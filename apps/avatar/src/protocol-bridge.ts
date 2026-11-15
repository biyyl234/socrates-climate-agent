/**
 * postMessage bridge between the app shell and this avatar bundle.
 *
 * The envelope shape, message types and enums are frozen in
 * `@socrates/core/protocol`; this layer only wraps validation and dispatch.
 * No new message types are introduced here.
 */
import {
  AVATAR_PROTOCOL,
  AVATAR_PROTOCOL_VERSION,
  isEnvelope,
  wrap,
  type AppToAvatar,
  type AvatarToApp,
  type Envelope,
} from "@socrates/core";

type IncomingHandler = (envelope: Envelope<AppToAvatar>) => void;

export class ProtocolBridge {
  private readonly incoming = new Set<IncomingHandler>();
  private readonly onMessage = (event: MessageEvent<unknown>): void => {
    const raw = event.data;
    if (!isEnvelope(raw)) return;
    // Versioned contract: silently ignore envelopes from an incompatible major
    // schema instead of throwing inside the shell.
    if (raw.protocol !== AVATAR_PROTOCOL || raw.version !== AVATAR_PROTOCOL_VERSION) return;
    for (const handler of this.incoming) {
      handler(raw as Envelope<AppToAvatar>);
    }
  };

  /** Subscribe to every incoming command envelope. */
  onIncoming(handler: IncomingHandler): void {
    this.incoming.add(handler);
  }

  /** Start listening for postMessage messages. */
  start(): void {
    window.addEventListener("message", this.onMessage);
  }

  /**
   * Send an avatar->app event envelope to the parent window.
   * In a top-level preview (no parent), post back to this window so local
   * smoke tests still observe the message.
   */
  send(message: AvatarToApp): void {
    const envelope = wrap(message);
    const target: Window = window.parent && window.parent !== window ? window.parent : window;
    target.postMessage(envelope, "*");
  }
}
