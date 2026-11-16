import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Post-process the FINAL index.html after every other plugin (including
 * singlefile) has finished: move the inlined module script to the end of body
 * and strip its module attributes so it becomes a classic IIFE script. Doing
 * this in closeBundle avoids transformIndexHtml ordering issues.
 */
function classicScriptTag(): Plugin {
  return {
    name: "socrates-classic-script-tag",
    closeBundle() {
      const outDir = join(__dirname, "dist");
      const file = join(outDir, "index.html");
      let html = readFileSync(file, "utf8");

      const inlineBodies: string[] = [];
      html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (full, body) => {
        if (/\ssrc\s*=/.test(full)) return full; // keep external (Cubism core)
        inlineBodies.push(body);
        return "";
      });
      html = html.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, "");
      const classic = inlineBodies.map((b) => `<script>${b}</script>`).join("\n");
      html = html.replace(/<\/body>/i, `${classic}\n</body>`);
      writeFileSync(file, html);
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [viteSingleFile(), classicScriptTag()],
  build: {
    target: "es2022",
    outDir: "dist",
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
  server: { port: 5173, host: true },
});
