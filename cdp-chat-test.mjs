import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { WebSocket } = require("./node_modules/.pnpm/ws@8.23.0/node_modules/ws");

const target = process.argv[2] || "http://localhost:8803/chat?story=beef";
const outPng = process.argv[3] || "/tmp/chat-integration.png";
const port = 9344;
const userDir = "/tmp/cdp-profile-" + port;
mkdirSync(userDir, { recursive: true });

const chrome = spawn("chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  "--enable-unsafe-swiftshader", "--use-gl=swiftshader",
  "--ignore-certificate-errors",
  `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`,
  "--window-size=800,1200", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
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

const ws = new WebSocket(await getWsUrl(), { maxPayload: 1e8 });
let id = 0;
const pending = new Map();
const logs = [];
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
  } else if (msg.method === "Runtime.consoleAPICalled") {
    const parts = (msg.params.args ?? []).map((a) => a.value ?? a.description ?? a.type);
    logs.push("[console." + msg.params.type + "] " + parts.join(" "));
  } else if (msg.method === "Runtime.exceptionThrown") {
    logs.push("[exception] " + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
  }
});
await new Promise((r) => (ws.onopen = r));
await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: target });

// Wait for greeting + avatar ready.
await sleep(6000);

const before = await send("Runtime.evaluate", {
  expression: `(() => {
    const ta = document.querySelector('textarea');
    const iframe = document.querySelector('iframe');
    return { hasTextarea: !!ta, hasIframe: !!iframe, bodyText: document.body.innerText.slice(0,120) };
  })()`,
  returnByValue: true,
});
console.log("=== before send ===");
console.log(JSON.stringify(before.result.value, null, 1));

// Type a message and submit using the native textarea + input event.
const typed = await send("Runtime.evaluate", {
  expression: `(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return { ok: false };
    ta.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '我今天午饭点了一份牛肉饭，大概200克');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true, value: ta.value };
  })()`,
  returnByValue: true,
});
console.log("typed:", JSON.stringify(typed.result.value));
await sleep(300);

// Click the 发送 button.
const clicked = await send("Runtime.evaluate", {
  expression: `(() => {
    const btns = [...document.querySelectorAll('button')];
    const sendBtn = btns.find((b) => b.innerText.trim() === '发送');
    if (!sendBtn) return { ok: false, labels: btns.map((b) => b.innerText) };
    sendBtn.click();
    return { ok: true };
  })()`,
  returnByValue: true,
});
console.log("clicked send:", JSON.stringify(clicked.result.value));

// Wait for the real LLM round-trip.
await sleep(14000);

const after = await send("Runtime.evaluate", {
  expression: `(() => {
    const full = document.body.innerText;
    const fallbackLine = '网络不太稳定，已切换到离线示例模式';
    const bubbles = [...document.querySelectorAll('div')].filter((d) => d.childElementCount > 0).length;
    // Check computed style of a frosted element for backdrop-filter.
    const ta = document.querySelector('textarea');
    const cs = ta ? getComputedStyle(ta.closest('div')) : null;
    return {
      hasFallback: full.includes(fallbackLine),
      mentionsBeef: full.includes('牛肉'),
      textLength: full.length,
      backdropFilterOnAncestor: cs ? (cs.backdropFilter || cs.webkitBackdropFilter) : null,
      iframeStillThere: !!document.querySelector('iframe'),
      excerpt: full.slice(0, 260),
    };
  })()`,
  returnByValue: true,
});
console.log("=== after send (integration) ===");
console.log(JSON.stringify(after.result.value, null, 1));

console.log("=== console / exceptions (" + logs.length + ") ===");
console.log(logs.join("\n") || "(none)");

const shot = await send("Page.captureScreenshot", { format: "png" });
const fs = await import("node:fs");
fs.writeFileSync(outPng, Buffer.from(shot.data, "base64"));
console.log("screenshot ->", outPng);

ws.close();
chrome.kill();
process.exit(0);
