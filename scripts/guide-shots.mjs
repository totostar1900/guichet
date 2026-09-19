// Captures the desk guide's screenshots (public/guide/<key>.png) from a dev
// server running on the in-memory seed (`npm run dev:memory`), signed in as a
// responsable through the dev cookie. Headless Chrome over CDP : no dependency.
//   npm run guide:shots            (server on http://localhost:3000)
//   BASE=http://localhost:3001 npm run guide:shots
//   GROUP=desk | GROUP=client      (the desk needs the seed and the dev cookie; the client pages
//                                   look better on real data: run them against `npm run dev`)
//   ONLY=titres-phone,carte-dos    (a few keys)
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

// The phone: onboarding and coaches marked seen, the cards detailed, the distinction « alternée », then a reload.
const PHONE_PREP = (extra = "") => `localStorage.setItem('guichet:onboarded','1'); ['titres','fonds','fiche','info','aide','parcours'].forEach(k => localStorage.setItem('guichet:coach:'+k,'1')); localStorage.setItem('guichet:hint:swipe:fiche','1'); localStorage.setItem('guichet:cartes','detail'); localStorage.setItem('guichet:cartes:sep','zebra'); ${extra} setTimeout(() => location.reload(), 0); 'ok'`;
// A finger on the n-th card: a pull to the left (actions) or to the right (the back), synthetic touches.
const PULL = (dir, nth = 1, wait = 3500) => `await new Promise(r => setTimeout(r, 800)); const card = document.querySelectorAll('article')[${nth}]; card.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); await new Promise(r => setTimeout(r, 400)); const target = card.querySelector('b') || card; const mk = (type, x, y) => { const t = new Touch({ identifier: 1, target, clientX: x, clientY: y }); return new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }); }; const x0 = ${dir} < 0 ? 300 : 60; target.dispatchEvent(mk('touchstart', x0, 300)); for (const k of [20, 80, 150, 220]) { await new Promise(r => setTimeout(r, 25)); target.dispatchEvent(mk('touchmove', x0 + ${dir} * k, 302)); } await new Promise(r => setTimeout(r, 30)); target.dispatchEvent(mk('touchend', x0 + ${dir} * 220, 302)); await new Promise(r => setTimeout(r, ${wait})); 'ok'`;

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
  ["docs", "/desk/docs"],
  ["docs-fonctionnement", "/desk/docs/fonctionnement"],
  ["docs-plateformes", "/desk/docs/plateformes"],
  ["docs-support", "/desk/docs/support"],
  ["docs-administration", "/desk/docs/administration"],
  ["docs-technique", "/desk/docs/technique"],
  ["docs-aide", "/desk/docs/aide", { maxHeight: 4200 }],
  ["docs-notes", "/desk/docs/notes"],
  ["aide-client", "/info/aide", { maxHeight: 4200 }],
  ["aide-entretien", "/info/aide", { prep: "localStorage.setItem('guichet:coach:aide','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 2500, then: "document.querySelectorAll('article section').forEach(sec => { if (!sec.querySelector('#entretien')) sec.remove(); }); 'ok'" }],
  // The client's Info page, and the « Premiers pas » screen about Info and help (phone width, fifth screen).
  ["titres-client", "/", { prep: "localStorage.setItem('guichet:onboarded','1'); localStorage.setItem('guichet:coach:titres','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 3000, maxHeight: 1100 }],
  ["fonds-client", "/fonds", { prep: "localStorage.setItem('guichet:onboarded','1'); localStorage.setItem('guichet:coach:fonds','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 3000, maxHeight: 1100 }],
  ["parcours-client", "/info/parcours", { prep: "localStorage.setItem('guichet:onboarded','1'); localStorage.setItem('guichet:coach:parcours','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 3000, maxHeight: 1400 }],
  ["lecon-carte", "/info/tresors-svt", { prep: "localStorage.setItem('guichet:onboarded','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 3000, maxHeight: 1500 }],
  ["info-client", "/info", { prep: "localStorage.setItem('guichet:onboarded','1'); localStorage.setItem('guichet:coach:info','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 3000 }],
  ["onboarding-info", "/info", { width: 390, height: 780, prep: "localStorage.setItem('guichet:onboarded','1'); localStorage.setItem('guichet:coach:info','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 3000 }],
  ["onboarding-aide", "/info/aide", { width: 390, height: 780, prep: "localStorage.setItem('guichet:onboarded','1'); localStorage.setItem('guichet:coach:aide','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 3000 }],
  ["premiers-pas", "/info?premiers-pas=1", { width: 390, height: 844, prep: "localStorage.setItem('guichet:onboarded','1'); setTimeout(() => location.reload(), 0); 'ok'", settle: 5000, then: "await new Promise(r=>setTimeout(r,800)); const d=[...document.querySelectorAll('[role=dialog]')].pop(); for (let k=0;k<4;k++){ [...d.querySelectorAll('button')].find(b=>/Continuer|Continue/.test(b.textContent))?.click(); await new Promise(r=>setTimeout(r,450)); } await new Promise(r=>setTimeout(r,600)); 'ok'" }],
  // The phone: the cards, their two densities, a card pulled left (Déclarer · Me rappeler) and turned over (calendar or curve, then the reference), the « ··· » sheet, the card settings.
  ["titres-phone", "/?vue=cards", { width: 390, height: 844, prep: PHONE_PREP(), settle: 4000, then: "window.scrollTo(0, 430); await new Promise(r => setTimeout(r, 400)); 'ok'" }],
  ["titres-compact", "/?vue=cards", { width: 390, height: 844, prep: PHONE_PREP("localStorage.setItem('guichet:cartes','compact'); localStorage.setItem('guichet:cartes:sep','zebrahalf');"), settle: 4000, then: "window.scrollTo(0, 430); await new Promise(r => setTimeout(r, 400)); 'ok'" }],
  ["carte-actions", "/?vue=cards", { width: 390, height: 844, prep: PHONE_PREP(), settle: 4000, then: PULL(-1, 1, 800) }],
  ["carte-dos", "/?vue=cards&marche=secondaire", { width: 390, height: 844, prep: PHONE_PREP(), settle: 4000, then: PULL(1, 2, 5000) }],
  ["fonds-phone", "/fonds", { width: 390, height: 844, prep: PHONE_PREP(), settle: 4000, then: "window.scrollTo(0, 980); await new Promise(r => setTimeout(r, 400)); 'ok'" }],
  ["fonds-dos", "/fonds", { width: 390, height: 844, prep: PHONE_PREP("localStorage.setItem('guichet:cartes','compact');"), settle: 4000, then: PULL(1, 1, 5000) }],
  ["menu-ligne", "/?vue=cards", { width: 390, height: 844, prep: PHONE_PREP(), settle: 4000, then: "window.scrollTo(0, 430); await new Promise(r => setTimeout(r, 400)); document.querySelectorAll('[aria-label=\"Plus d\'actions\"]')[0]?.click(); await new Promise(r => setTimeout(r, 700)); 'ok'" }],
  ["affichage-cartes", "/?vue=cards", { width: 390, height: 844, prep: PHONE_PREP(), settle: 4000, then: "document.querySelector('[aria-label=\"Affichage des cartes\"]')?.click(); await new Promise(r => setTimeout(r, 700)); 'ok'" }],
  ["fiche-phone", "/?vue=cards", { width: 390, height: 844, prep: PHONE_PREP(), settle: 4000, follow: "article a[href^=\"/offres/\"]", then: "window.scrollTo(0, 120); await new Promise(r => setTimeout(r, 400)); 'ok'" }],
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

const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const GROUP = process.env.GROUP; // desk | client
for (const [key, path, opts = {}] of SHOTS) {
  if (ONLY && !ONLY.has(key)) continue;
  if (GROUP === "desk" && !path.startsWith("/desk")) continue;
  if (GROUP === "client" && path.startsWith("/desk")) continue;
  let url = `${BASE}${path}`;
  const W = opts.width ?? 1366;
  if (path === "/desk?first-intent") {
    // The intention page: the first row of the carnet.
    await send("Page.navigate", { url: `${BASE}/desk` });
    await sleep(2500);
    const href = await evaluate(`document.querySelector('[data-coach=intents] tbody a[href^="/desk/intentions/"]')?.getAttribute('href') ?? ''`);
    if (!href) continue;
    url = `${BASE}${href}`;
  }
  if (opts.width) await send("Emulation.setDeviceMetricsOverride", { width: W, height: opts.height ?? 900, deviceScaleFactor: 1, mobile: W < 760 });
  await send("Page.navigate", { url });
  await sleep(2800);
  // A page may need a gesture first (dismiss the onboarding, open a screen…).
  if (opts.prep) await evaluate(`(async () => { ${opts.prep} })()`);
  if (opts.settle) await sleep(opts.settle);
  // A shot of the page behind a link of this one (the first card's fiche).
  if (opts.follow) {
    const href = await evaluate(`document.querySelector('${opts.follow}')?.getAttribute('href') ?? ''`);
    if (!href) continue;
    await send("Page.navigate", { url: `${BASE}${href}` });
    await sleep(4500);
  }
  if (opts.then) await evaluate(`(async () => { ${opts.then} })()`);
  // Let images and fonts settle, then a full-height capture, capped.
  const measured = Number(await evaluate("document.documentElement.scrollHeight"));
  const height = opts.height ?? Math.min(opts.maxHeight ?? 1800, Number.isFinite(measured) && measured > 0 ? measured : 900);
  // A phone shot keeps its viewport (the page is scrolled to the part that matters) : captured as seen, not beyond.
  const asSeen = Boolean(opts.height);
  await send("Emulation.setDeviceMetricsOverride", { width: W, height, deviceScaleFactor: 1, mobile: W < 760 });
  await sleep(400);
  const { data } = asSeen ? await send("Page.captureScreenshot", { format: "png" }) : await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height, scale: 1 } });
  writeFileSync(`${OUT}${key}.png`, Buffer.from(data, "base64"));
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  console.log(`${key}.png (${height}px)`);
}
ws.close();
chrome.kill();
