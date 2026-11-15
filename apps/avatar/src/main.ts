/**
 * Entry point for the avatar bundle.
 * Loaded directly by the web page and by the native App's WebView from the same
 * URL, so behavior must be identical across both hosts.
 */
import { AvatarApp } from "./avatar-app";

const root = document.getElementById("avatar-root");
if (!root) {
  throw new Error("Avatar mount point #avatar-root is missing");
}

const app = new AvatarApp(root);
void app.boot();

// Exposed for local smoke tests / debugging only; the shell must use postMessage.
(window as { __socratesAvatar?: AvatarApp }).__socratesAvatar = app;
