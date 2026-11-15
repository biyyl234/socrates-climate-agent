#!/usr/bin/env node
/**
 * Syncs the standalone avatar build (apps/avatar/dist) into the app at a
 * location that survives the root `.gitignore` `dist/` rule (EAS cloud builds
 * upload only what git tracks, so the avatar bundle must live outside any
 * `dist/`/`build/` directory before prebuild).
 *
 * Modes:
 *   (default)  apps/avatar/dist -> apps/app/embedded-assets/avatar
 *              Native prebuild copies this staging dir into Android assets via
 *              the `with-bundled-avatar` config plugin; the bundle ships inside
 *              the APK/AAB and loads over file:// with no network.
 *   --web      apps/avatar/dist -> apps/app/dist/avatar
 *              Same bundle, copied after `expo export -p web`, so the web shell
 *              loads it same-origin from `/avatar/index.html`.
 *
 * Cross-platform (node:fs only), idempotent: the target is wiped first so stale
 * chunks / removed motions / old textures never linger.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const repoRoot = resolve(appRoot, "..", "..");

const source = resolve(repoRoot, "apps", "avatar", "dist");
const webMode = process.argv.includes("--web");
const target = webMode
  ? resolve(appRoot, "dist", "avatar")
  : resolve(appRoot, "embedded-assets", "avatar");

if (!existsSync(source)) {
  console.error(`[sync-avatar] source bundle not found: ${source}`);
  process.exit(1);
}

// Wipe the target first: old fingerprinted chunks or removed Live2D files must
// not survive a rebuild of the avatar bundle.
if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const entryPath = resolve(dir, entry);
    if (statSync(entryPath).isDirectory()) {
      total += countFiles(entryPath);
    } else {
      total += 1;
    }
  }
  return total;
}

const fileCount = countFiles(target);
console.log(
  `[sync-avatar] ${webMode ? "web" : "embedded"}: ${source} -> ${target} (${fileCount} files)`,
);
