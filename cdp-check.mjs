import { spawn } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { WebSocket } = require("./node_modules/.pnpm/ws@8.23.0/node_modules/ws");

const target = process.argv[2];
const outPng = process.argv[3];
const waitMs = Number(process.argv[4] ?? 12000);

const port = 9333;
const userDir = "/tmp/cdp-profile-" + port;
mkdirSync(userDir, { recursive: true });

const chrome = spawn(
  "chromium",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--enable-unsafe-swiftshader",
    "--use-gl=swiftshader",
    "--allow-file-access-from-files",
    "--allow-file-access",
    "--disable-web-security",
    "--ignore-certificate-errors",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDir}`,
    "--window-size=800,1200",
    "about:blank",
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
const logs = [];
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  } else if (msg.method === "Runtime.consoleAPICalled") {
    const parts = (msg.params.args ?? []).map((a) => a.value ?? a.description ?? a.type);
    logs.push("[console." + msg.params.type + "] " + parts.join(" "));
  } else if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    const stack = (d.exception?.stackTrace?.callFrames ?? []).slice(0, 6)
      .map((f) => f.functionName + "@" + (f.url || "").split("/").pop() + ":" + f.lineNumber)
      .join(" | ");
    logs.push("[exception] " + (d.exception?.description ?? d.text) + " STACK " + stack);
  } else if (msg.method === "Log.entryAdded") {
    logs.push("[log] " + msg.params.entry.text);
  }
});
await new Promise((r) => (ws.onopen = r));

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Page.navigate", { url: target });

await sleep(waitMs);

const state = await send("Runtime.evaluate", {
  expression: `(() => {
    const a = window.__socratesAvatar;
    const canvases = [...document.querySelectorAll('canvas')].map(c => ({ w: c.width, h: c.height }));
    return a ? { booted: true, hasApp: !!a, canvases, rootChildren: document.getElementById('avatar-root')?.children.length }
             : { booted: false, hasApp: false, canvases };
  })()`,
  returnByValue: true,
});
console.log("=== runtime state ===");
console.log(JSON.stringify(state.result.value, null, 2));
console.log("=== console / exceptions (" + logs.length + ") ===");
console.log(logs.join("\n") || "(none)");

const shot = await send("Page.captureScreenshot", { format: "png" });
const buf = Buffer.from(shot.data, "base64");
const fs = await import("node:fs");
fs.writeFileSync(outPng, buf);
console.log("screenshot bytes:", buf.length, "->", outPng);

ws.close();
chrome.kill();
process.exit(0);
