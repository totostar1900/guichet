// Captures the desk guide's screenshots (public/guide/<key>.png) from a dev
// server running on the in-memory seed (`npm run dev:memory`), signed in as a
// responsable through the dev cookie. Headless Chrome over CDP — no dependency.
//   npm run guide:shots            (server on http://localhost:3000)
//   BASE=http://localhost:3001 npm run guide:shots
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = new URL("../public/guide/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CHROME = process.env.CHROME ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);
if (!CHROME) throw new Error("Chrome introuvable : CHROME=<chemin>");

// The dev session cookie, signed like src/lib/auth/dev.ts.
// The server reads AUTH_SECRET from .env.local; so do we (never printed).
const envLocal = new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const fromEnvFile = existsSync(envLocal) ? readFileSync(envLocal, "utf8").match(/^AUTH_SECRET=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") : undefined;
const secret = process.env.AUTH_SECRET ?? fromEnvFile ?? "guichet-dev-secret-change-me";
const session = { userId: "dev-responsable-guide", role: "responsable", name: "Guide", segment: "Desk Purpose Capital", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
const cookie = `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;

const SHOTS = [
  ["carnet", "/desk"],
  ["intention", "/desk?first-intent"],
  ["a-valider", "/desk/a-valider"],
  ["resultats", "/desk/resultats"],
  ["documents", "/desk/documents"],
  ["clients", "/desk/clients"],
  ["messages", "/desk/messages"],
  ["marche", "/desk/marche"],
  ["actualites", "/desk/actualites?cle=n-20260918-veille-scgre"],
  ["docs", "/desk/docs/fonctionnement"],
  ["robot", "/desk/robot"],
  ["approbations", "/desk/approbations"],
  ["referentiel", "/desk/referentiel"],
  ["journal", "/desk/journal"],
  ["equipe", "/desk/equipe"],
  ["reporting", "/desk/reporting"],
  ["sante", "/desk/sante"],
];

const port = 9333;
const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, "--headless=new", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--window-size=1366,900", `--user-data-dir=${process.env.TEMP ?? "/tmp"}/guichet-shots`, "about:blank"], { stdio: "ignore" });
process.on("exit", () => chrome.kill());

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json());
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error("Chrome ne répond pas");
}

const ws = new WebSocket(await target());
await new Promise((res) => (ws.onopen = res));
let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Network.enable");
await send("Network.setCookie", { name: "guichet_dev_session", value: cookie, url: BASE, path: "/" });
// The guide is written in French; the profile may remember another language from earlier runs.
await send("Network.setCookie", { name: "guichet_lang", value: process.env.LANG_COOKIE ?? "fr", url: BASE, path: "/" });
await send("Page.enable");
mkdirSync(OUT, { recursive: true });

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
}

for (const [key, path] of SHOTS) {
  let url = `${BASE}${path}`;
  if (path === "/desk?first-intent") {
    // The intention page: the first row of the carnet.
    await send("Page.navigate", { url: `${BASE}/desk` });
    await sleep(2500);
    const href = await evaluate(`document.querySelector('[data-coach=intents] tbody a[href^="/desk/intentions/"]')?.getAttribute('href') ?? ''`);
    if (!href) continue;
    url = `${BASE}${href}`;
  }
  await send("Page.navigate", { url });
  await sleep(2800);
  // Let images and fonts settle, then a full-height capture, capped.
  const height = Math.min(1800, await evaluate("document.documentElement.scrollHeight"));
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1366, height, scale: 1 } });
  writeFileSync(`${OUT}${key}.png`, Buffer.from(data, "base64"));
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  console.log(`${key}.png (${height}px)`);
}
ws.close();
chrome.kill();
