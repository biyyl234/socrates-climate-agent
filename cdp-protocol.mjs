import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { WebSocket } = require("./node_modules/.pnpm/ws@8.23.0/node_modules/ws");

const target = process.argv[2];
const port = 9344;
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
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
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
await send("Page.navigate", { url: target });
await sleep(6000);

const inPage = `(async () => {
  const received = [];
  window.addEventListener("message", (e) => { if (e.data && e.data.type) received.push(e.data.type); });
  const app = window.__socratesAvatar;
  const dispatch = (m) => window.dispatchEvent(new MessageEvent("message", { data: m }));
  const wrap = (type, payload) => ({ protocol: "socrates-avatar", version: 1, type, payload });
  // Give the ready emission a moment, then drive commands.
  dispatch(wrap("init", { level: 0, theme: "light", locale: "zh-CN" }));
  dispatch(wrap("set_state", { state: "Thinking" }));
  dispatch(wrap("expression", { expressionId: "exp-think" }));
  dispatch(wrap("speak", { utteranceId: "u1", text: "我们来看看这瓶水的碳足迹。" }));
  await new Promise((r) => setTimeout(r, 2500));
  const mouthDuring = (() => {
    // reach into live model via app's stage if exposed
    const stage = app && app.live2d;
    return stage ? { hasStage: true } : { hasStage: false };
  })();
  dispatch(wrap("set_state", { state: "Idle" }));
  await new Promise((r) => setTimeout(r, 500));
  return {
    messagesReceivedByHost: received,
    appPresent: !!app,
    booted: !!app,
    mouthDuring,
  };
})()`;
const res = await send("Runtime.evaluate", { expression: inPage, awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(res.result.value, null, 2));

// Idle-stability check: leave it running ~20s and confirm canvas still alive.
await sleep(20000);
const alive = await send("Runtime.evaluate", {
  expression: `(() => {
    const c = document.querySelector('canvas');
    return { canvasPresent: !!c, canvasW: c ? c.width : 0, appPresent: !!window.__socratesAvatar };
  })()`,
  returnByValue: true,
});
console.log("after ~26s total:", JSON.stringify(alive.result.value));
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("/tmp/cdp-protocol.png", Buffer.from(shot.data, "base64"));
ws.close();
chrome.kill();
process.exit(0);
