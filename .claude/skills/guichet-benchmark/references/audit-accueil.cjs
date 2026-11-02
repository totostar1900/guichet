// Audit des encres et des fonds de l'Accueil, à 390 px, thèmes sombre et clair.
// Usage : GUICHET_DEV_SESSION=<cookie client de démonstration> node audit-accueil.cjs [url]
// (serveur local : GUICHET_SEMIS=reference npx next dev -p 3000). Ne lit que la page ; n'imprime aucun secret.
const { createRequire } = require("module");
const { chromium } = createRequire(process.cwd() + "/package.json")("playwright");
const URL_ = process.argv[2] || "http://localhost:3000/";
(async () => {
  const b = await chromium.launch();
  for (const theme of ["dark", "light"]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addCookies([{ name: "guichet_dev_session", value: process.env.GUICHET_DEV_SESSION, domain: new URL(URL_).hostname, path: "/" }]);
    const p = await ctx.newPage();
    await p.goto(URL_, { waitUntil: "domcontentloaded", timeout: 900000 }); await p.waitForTimeout(2500);
    await p.evaluate((th) => { localStorage.setItem("guichet:onboarded", "1"); localStorage.setItem("guichet:presented", "1"); localStorage.setItem("guichet:theme", th); }, theme);
    await p.goto(URL_, { waitUntil: "domcontentloaded", timeout: 900000 }); await p.waitForTimeout(5000);
    const r = await p.evaluate(() => {
      const root = document.querySelector(".chapitres"), cs = getComputedStyle(document.documentElement);
      const norm = (c) => { const e = document.createElement("span"); e.style.color = c; document.body.appendChild(e); const v = getComputedStyle(e).color; e.remove(); return v; };
      const ink = { ink: norm(cs.getPropertyValue("--ink")), "ink-2": norm(cs.getPropertyValue("--ink-2")), "ink-3": norm(cs.getPropertyValue("--ink-3")) };
      const tot = {}; let n = 0;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const s = w.currentNode.textContent.trim(); if (!s) continue; const c = getComputedStyle(w.currentNode.parentElement); if (c.display === "none") continue;
        const k = Object.keys(ink).find((x) => ink[x] === c.color) || "couleur"; tot[k] = (tot[k] || 0) + s.length; n += s.length; }
      const fonds = new Set([...root.querySelectorAll("a,section,li,div")].map((e) => getComputedStyle(e).backgroundColor).filter((c) => !/rgba\(0, 0, 0, 0\)/.test(c)));
      const sec = [...root.querySelectorAll("section")];
      const depassent = sec.flatMap((s) => [...s.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().right > s.getBoundingClientRect().right + 4).slice(0, 2).map((e) => [s.getAttribute("aria-label") || s.className, e.className]));
      const petits = [...root.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 10.2).map((e) => [e.textContent.trim().slice(0, 24), getComputedStyle(e).fontSize]).slice(0, 8);
      return { partDeCouleur: Math.round(((tot.couleur || 0) / n) * 100) + " %", repartition: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, Math.round((v / n) * 100)])), fondsDistincts: [...fonds], depassent, texteSousLeSeuil: petits };
    });
    console.log(theme, JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
