/** Les pages du site de la BEAC qui parlent du marche des titres publics. */
const PAGES = ["https://www.beac.int/m-des-titres-publics/", "https://www.beac.int/publications/", "https://www.beac.int/"];
const vus = new Map();
for (const u of PAGES) {
  let html;
  try { html = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => (r.ok ? r.text() : null)); } catch { html = null; }
  if (!html) { console.log(`${u} : pas de reponse`); continue; }
  console.log(`${u} : ${html.length} octets`);
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,160}?)<\/a>/gi)) {
    const t = m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    if (!t) continue;
    if (!/encours|statistiq|titres publics|march[ée]|rapport|bulletin|annuaire|donn[ée]es/i.test(t)) continue;
    const url = m[1].startsWith("http") ? m[1] : `https://www.beac.int${m[1]}`;
    if (!vus.has(url)) vus.set(url, t);
  }
}
console.log(`\n${vus.size} lien(s) retenus :`);
for (const [u, t] of vus) console.log(`   ${t.slice(0, 78).padEnd(78)} ${u.slice(0, 92)}`);
