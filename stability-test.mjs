import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { WebSocket } = require("./node_modules/.pnpm/ws@8.23.0/node_modules/ws");

const target = process.argv[2];
const holdSec = Number(process.argv[3] ?? 75);
const port = 9335;
const userDir = "/tmp/cdp-profile-" + port;
mkdirSync(userDir, { recursive: true });

const chrome = spawn(
  "chromium",
  [
    "--head=new", "--no-sandbox", "--disable-gpu",
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
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});
await new Promise((r) => (ws.onopen = r));
await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: target });
await sleep(9000);

// Probe runs inside the same-origin iframe that hosts the avatar bundle.
const probeExpr = `(() => {
  const iframe = document.querySelector('iframe');
  const w = iframe?.contentWindow;
  const a = w?.__socratesAvatar;
  const r = a?.renderer;
  const canvas = w?.document.querySelector('canvas');
  let painted = 0;
  if (canvas && w) {
    const cctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    const data = cctx.getImageData(0, 0, cw, ch).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
  }
  return { hasAvatar: !!a, hasRenderer: !!r, hasCanvas: !!canvas, painted };
})()`;

async function probe(label) {
  const res = await send("Runtime.evaluate", { expression: probeExpr, returnByValue: true });
  console.log(label, JSON.stringify(res.result.value));
  return res.result.value;
}
const first = await probe("t=0s  ");
await sleep(holdSec * 1000);
const last = await probe(`t=${holdSec}s `);
const ok =
  first.hasRenderer && last.hasRenderer && last.hasCanvas && last.painted > 0 &&
  Math.abs(last.painted - first.painted) < first.painted * 0.25 + 50;
console.log("STABILITY:", ok ? "PASS" : "FAIL");
ws.close();
chrome.kill();
process.exit(ok ? 0 : 1);
