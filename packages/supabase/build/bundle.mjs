/**
 * esbuild bundler for Supabase Edge Functions (Deno).
 *
 * Each function entry is compiled into a self-contained ESM file under
 * supabase/functions/<name>/index.ts. Shared domain logic is imported from the
 * real @socrates/core and @socrates/data source packages; alias points esbuild
 * straight at their source so the deployed bundle contains no duplicated engine
 * or guard implementation.
 *
 * Run: node build/bundle.mjs
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, rmSync } from "node:fs";

const require = createRequire(import.meta.url);
const esbuild = require(
  "../../../node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js",
);

const buildDir = dirname(fileURLToPath(import.meta.url));
const supabasePkgDir = dirname(buildDir);
const repoRoot = dirname(dirname(supabasePkgDir));

const coreEntry = join(repoRoot, "packages", "core", "src", "index.ts");
const dataEntry = join(repoRoot, "packages", "data", "src", "index.ts");
const functionsRoot = join(supabasePkgDir, "supabase", "functions");

const FUNCTIONS = ["chat", "tts", "product", "lca", "compare", "commitment"];

rmSync(functionsRoot, { recursive: true, force: true });
mkdirSync(functionsRoot, { recursive: true });

for (const name of FUNCTIONS) {
  const entry = join(buildDir, "entries", `${name}.ts`);
  const outDir = join(functionsRoot, name);
  mkdirSync(outDir, { recursive: true });
  const outfile = join(outDir, "index.ts");

  // eslint-disable-next-line no-await-in-loop
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    alias: {
      "@socrates/core": coreEntry,
      "@socrates/data": dataEntry,
    },
    logLevel: "warning",
    sourcemap: false,
    legalComments: "none",
    charset: "utf8",
  });

  console.log(`bundled ${name} -> ${outfile}`);
}

console.log("done");
