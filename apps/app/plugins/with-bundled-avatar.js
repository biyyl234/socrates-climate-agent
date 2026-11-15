/**
 * Expo config plugin: bundles the offline Live2D avatar into the Android app.
 *
 * At prebuild time it copies the staged avatar bundle
 * (`<projectRoot>/embedded-assets/avatar`, produced by
 * `scripts/sync-avatar.mjs`) into the generated Android project's assets:
 *
 *   `<projectRoot>/android/app/src/main/assets/avatar`
 *
 * The native WebView then loads it from
 * `file:///android_asset/avatar/index.html`; ES modules, fetch/XHR and textures
 * resolve under the three file-access flags set in AvatarHost.tsx.
 *
 * CommonJS on purpose: Expo prebuild loads plugins through its Node config
 * pipeline, which expects CommonJS modules here.
 */
const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

function copyAvatarToAndroidAssets(config) {
  const projectRoot = config.modRequest.projectRoot;
  const source = path.join(projectRoot, "embedded-assets", "avatar");
  const target = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "assets",
    "avatar",
  );

  if (fs.existsSync(source)) {
    // Idempotent: drop a previous copy so stale chunks / textures don't linger.
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
    console.log(`[with-bundled-avatar] copied ${source} -> ${target}`);
  } else {
    console.warn(
      `[with-bundled-avatar] staging dir not found: ${source}. ` +
        "Run `node scripts/sync-avatar.mjs` before prebuild/EAS build.",
    );
  }

  // modRunner contract: return the (possibly modified) config/props unchanged.
  return config;
}

const withBundledAvatar = (config) => {
  return withDangerousMod(config, ["android", copyAvatarToAndroidAssets]);
};

module.exports = withBundledAvatar;
