/**
 * Bundles the Node serverless chat handler (server/chat.ts) into a self-contained
 * api/chat.js for the static deployment. esbuild aliases @socrates/core and
 * @socrates/data at their source so the function shares the real orchestrator,
 * guards and LCA engine. Output goes to static-deploy/api/chat.js.
 *
 * Run: node scripts/build-serverless.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const esbuild = require(
  "../../../node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js",
);

const here = dirname(fileURLToPath(import.meta.url));
const appDir = dirname(here);
const repoRoot = dirname(dirname(appDir));

const coreEntry = join(repoRoot, "packages", "core", "src", "index.ts");
const dataEntry = join(repoRoot, "packages", "data", "src", "index.ts");

const entry = join(appDir, "server", "chat.ts");
const outDir = join(appDir, "static-deploy", "api");
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, "chat.js");

await esbuild.build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  packages: "external",
  alias: {
    "@socrates/core": coreEntry,
    "@socrates/data": dataEntry,
  },
  logLevel: "info",
  sourcemap: false,
  legalComments: "none",
  charset: "utf8",
});

console.log("bundled serverless chat ->", outfile);
