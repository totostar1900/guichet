/** Ce que portent les pages de statistiques du marche des titres publics. */
const PAGES = [
  "https://www.beac.int/m-des-titres-publics/statistiques-mensuelles-marche-valeurs-tresor/",
  "https://www.beac.int/m-des-titres-publics/bulletins-marche-titres-publics/",
  "https://www.beac.int/economie-stats/statistiques-titres-publics/",
  "https://www.beac.int/m-des-titres-publics/programme-annuel-emissions-de-titres-publics-etats-de-cemac/",
];
for (const u of PAGES) {
  let html;
  try { html = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => (r.ok ? r.text() : null)); } catch { html = null; }
  console.log(`\n=== ${u}`);
  if (!html) { console.log("   pas de reponse"); continue; }
  const liens = [...html.matchAll(/<a[^>]+href="([^"]+\.(?:pdf|xlsx?|csv))"[^>]*>([\s\S]{0,200}?)<\/a>/gi)]
    .map((m) => ({ url: m[1].startsWith("http") ? m[1] : `https://www.beac.int${m[1]}`, t: m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() }));
  const uniq = new Map(liens.map((x) => [x.url, x.t]));
  console.log(`   ${html.length} octets · ${uniq.size} fichier(s)`);
  let i = 0;
  for (const [url, t] of uniq) { if (i++ >= 8) break; console.log(`      ${(t || decodeURIComponent(url.split("/").pop())).slice(0, 86)}`); }
}
