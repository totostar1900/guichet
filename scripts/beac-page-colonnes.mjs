/**
 * CE QUE PORTE LA COLONNE DE DROITE D'UNE PAGE DE LA BEAC.
 *
 * Georges signale que la colonne de droite d'une page porte « plusieurs
 * résultats d'adjudications ». Notre ramasseur prend tous les liens vers un
 * PDF d'une page, sans distinguer les colonnes : s'il manque des résultats,
 * c'est soit que la page n'est pas dans notre liste, soit que la colonne les
 * sert autrement (un widget chargé après coup, un lien sans extension).
 *
 * ON NE DEVINE PAS, ON REGARDE : pour chaque page, les liens vers un document,
 * les liens vers une AUTRE page, et ce que le voisinage du lien appelle.
 *
 *   npx tsx scripts/beac-page-colonnes.mjs [url]
 */
import fs from "node:fs";

const dire = (s) => fs.writeSync(1, `${s}\n`);
const PAGES = process.argv[2]
  ? [process.argv[2]]
  : [
      "https://www.beac.int/economie-stats/statistiques-titres-publics/",
      "https://www.beac.int/m-des-titres-publics/statistiques-mensuelles-marche-valeurs-tresor/",
      "https://www.beac.int/m-des-titres-publics/avis-et-communiques-du-marche-des-titres-publics/",
    ];

for (const url of PAGES) {
  dire(`\n################ ${url}`);
  let html;
  try {
    html = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => (r.ok ? r.text() : null));
  } catch {
    html = null;
  }
  if (!html) {
    dire("   ne répond pas");
    continue;
  }
  dire(`   ${Math.round(html.length / 1024)} Ko`);

  /* Les rubriques : ce que la page annonce d'elle-même. */
  const titres = [...html.matchAll(/<h([1-4])[^>]*>([\s\S]{0,160}?)<\/h\1>/gi)].map((m) => `h${m[1]} ${m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`);
  dire(`   --- ${titres.length} titre(s)`);
  for (const t of titres.slice(0, 40)) dire(`       ${t.slice(0, 120)}`);

  /* Tous les liens, séparés en documents et pages. */
  const liens = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,200}?)<\/a>/gi)].map((m) => ({
    url: m[1].startsWith("http") ? m[1] : `https://www.beac.int${m[1]}`,
    t: m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
  }));
  const docs = liens.filter((l) => /\.(pdf|xlsx?|csv|docx?)$/i.test(l.url));
  const pages = liens.filter((l) => !/\.(pdf|xlsx?|csv|docx?)$/i.test(l.url) && /beac\.int/.test(l.url));
  dire(`   --- ${docs.length} lien(s) vers un document, ${new Set(docs.map((d) => d.url)).size} distinct(s)`);
  for (const d of docs.slice(0, 12)) dire(`       ${(d.t || "(sans texte)").slice(0, 100)}`);

  const adj = pages.filter((p) => /adjudication|resultat|r%C3%A9sultat|emission|titre/i.test(p.url + " " + p.t));
  dire(`   --- ${adj.length} lien(s) de page qui parlent d'adjudication ou de titres`);
  const vus = new Set();
  for (const p of adj) {
    if (vus.has(p.url)) continue;
    vus.add(p.url);
    dire(`       ${(p.t || "(sans texte)").slice(0, 70).padEnd(70)} ${p.url.slice(0, 110)}`);
  }
}
