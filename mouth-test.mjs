import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { WebSocket } = require("./node_modules/.pnpm/ws@8.23.0/node_modules/ws");

const target = process.argv[2];
const outPng = process.argv[3];
const port = 9334;
const userDir = "/tmp/cdp-profile-" + port;
mkdirSync(userDir, { recursive: true });

const chrome = spawn(
  "chromium",
  [
    "--headless=new", "--no-sandbox", "--disable-gpu",
    "--enable-unsafe-swiftshader", "--use-gl=swiftshader",
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`,
    "--window-size=800,1200", "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
chrome.stderr.on("data", () => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("devtools not reachable");
}
const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl, { maxPayload: 1e8 });
let id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
const reqs = [];
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  } else if (msg.method === "Network.requestWillBeSent") {
    reqs.push(msg.params.request.url.split("/").pop());
  }
});
await new Promise((r) => (ws.onopen = r));
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Page.navigate", { url: target });
await sleep(2500);

const ampExpr = process.env.AMP
  ? `() => ${Number(process.env.AMP)}`
  : `() => 0.35 + 0.5 * Math.abs(Math.sin(performance.now() / 130))`;
const forced = await send("Runtime.evaluate", {
  expression: `(() => {
    const a = window.__socratesAvatar;
    const r = a.renderer;
    a.speaking = true;
    a.audio.currentAmplitude = ${ampExpr};
    r.applyStatePosture('Speaking');
    return { hasRenderer: !!r, ctor: r.constructor.name };
  })()`,
  returnByValue: true,
});
console.log("forced:", JSON.stringify(forced.result.value));
await sleep(400);

const shot = await send("Page.captureScreenshot", { format: "png" });
const fs = await import("node:fs");
fs.writeFileSync(outPng, Buffer.from(shot.data, "base64"));
console.log("404-ish requests:", reqs.filter((u) => u.includes("favicon") || u.endsWith(".ico")));
ws.close();
chrome.kill();
process.exit(0);
