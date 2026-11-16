import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

const root = process.argv[2];
const port = Number(process.argv[3] ?? 8802);
const cleanRoutes = ["", "onboarding", "chat", "commitments", "compare", "settings", "_sitemap", "+not-found"];

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".moc3": "application/octet-stream",
};

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    // SPA: every extensionless route serves the single shell; real static
    // assets (with extensions) are served from the filesystem.
    if (!extname(file)) {
      file = "/index.html";
    }
    const abs = join(root, file);
    const data = await readFile(abs);
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 " + e.message);
  }
}).listen(port, () => console.log("clean server on", port, "root", root));
