import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { WebSocket } = require("./node_modules/.pnpm/ws@8.23.0/node_modules/ws");
const port = 9355;
mkdirSync("/tmp/cdp-profile-" + port, { recursive: true });
const chrome = spawn(
  "chromium",
  [
    "--headless=new", "--no-sandbox", "--disable-gpu",
    "--enable-unsafe-swiftshader", "--use-gl=swiftshader",
    `--remote-debugging-port=${port}`,
    "--user-data-dir=/tmp/cdp-profile-" + port,
    "--window-size=800,1200", "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
chrome.stderr.on("data", () => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const p = l.find((t) => t.type === "page");
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("no devtools");
}
const ws = new WebSocket(await wsUrl(), { maxPayload: 1e8 });
let id = 0;
const pending = new Map();
const send = (m, p = {}) =>
  new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method: m, params: p }));
  });
ws.on("message", (d) => {
  const m = JSON.parse(d);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
});
await new Promise((r) => (ws.onopen = r));
await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: process.argv[2] });
await sleep(5000);

const probe = `(async () => {
  const collected = [];
  window.addEventListener("message", (e) => {
    collected.push({ type: e.data && e.data.type, protocol: e.data && e.data.protocol, version: e.data && e.data.version, keys: Object.keys(e.data || {}) });
  });
  const iframe = document.querySelector('iframe');
  const src = iframe.src;
  iframe.src = 'about:blank';
  await new Promise((r) => setTimeout(r, 600));
  iframe.src = src;
  await new Promise((r) => setTimeout(r, 6000));
  return { collected, iframeSrc: iframe.src, appBridgeLevel: window.__socratesAvatar ? 'n/a(web shell)' : 'none' };
})()`;
const res = await send("Runtime.evaluate", { expression: probe, awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(res.result.value, null, 2));
ws.close();
chrome.kill();
process.exit(0);
