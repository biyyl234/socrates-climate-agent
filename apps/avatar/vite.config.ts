import { defineConfig } from "vite";

// The avatar bundle is built as a standalone library page that the app loads
// directly (web) or inside a WebView (native). Output to dist/ as a static site.
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
    assetsInlineLimit: 0,
  },
  server: { port: 5173, host: true },
});
