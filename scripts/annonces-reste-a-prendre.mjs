/**
 * COMBIEN DE RÉSULTATS D'ADJUDICATION LA PAGE PORTE-T-ELLE, ET COMBIEN EN
 * AVONS-NOUS LUS ?
 *
 * Georges signale « plusieurs résultats d'adjudications » dans la colonne de
 * droite. Nous avons 249 communiqués de résultats en base, pour 536 levées
 * connues : s'il en reste sur la page, ce n'est pas une estimation qu'il faut,
 * c'est un compte.
 *
 * ON COMPTE SUR LA PAGE ET SUR LA BASE, PAS SUR UN SOUVENIR. Le rapprochement
 * se fait sur l'ADRESSE, seule chose que les deux côtés écrivent de la même
 * façon : un titre, la BEAC le remanie.
 *
 *   npx tsx --conditions=react-server scripts/annonces-reste-a-prendre.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const PAGE = "https://www.beac.int/m-des-titres-publics/annonces-et-communiques/";
const html = await fetch(PAGE, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => r.text());
const vus = new Map();
for (const m of html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]{0,250}?)<\/a>/gi)) {
  const url = m[1].startsWith("http") ? m[1] : `https://www.beac.int${m[1]}`;
  if (!vus.has(url)) vus.set(url, m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
}
dire(`${vus.size} document(s) distinct(s) sur la page\n`);

/* La famille se lit dans le titre, et ces deux mots ne se confondent pas. */
const RESULTAT = /r[ée]sultats?/i;
const ANNONCE = /annonce/i;
const familles = new Map();
for (const [url, t] of vus) {
  const f = RESULTAT.test(t) ? "résultats" : ANNONCE.test(t) ? "annonce" : "autre";
  familles.set(f, [...(familles.get(f) ?? []), { url, t }]);
}
for (const [f, l] of [...familles].sort((a, b) => b[1].length - a[1].length)) dire(`   ${f.padEnd(12)} ${l.length}`);

async function toutes(table, colonne) {
  const out = new Set();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select(colonne).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    for (const x of data ?? []) if (x[colonne]) out.add(x[colonne]);
    if ((data ?? []).length < 1000) break;
  }
  return out;
}
const resultatsLus = await toutes("auction_results", "source_url");
const avisLus = await toutes("emission_notices", "source_url");
const ecartees = await toutes("beac_observations", "url");
dire(`\n   en base : ${resultatsLus.size} résultat(s), ${avisLus.size} avis`);

const manqueR = (familles.get("résultats") ?? []).filter((x) => !resultatsLus.has(x.url));
const manqueA = (familles.get("annonce") ?? []).filter((x) => !avisLus.has(x.url));
const autres = familles.get("autre") ?? [];
dire(`\n=== JAMAIS LUS ===`);
dire(`   résultats  ${manqueR.length}`);
dire(`   annonces   ${manqueA.length}`);
dire(`   autres     ${autres.length}`);
dire(`\n   (${[...manqueR, ...manqueA, ...autres].filter((x) => !ecartees.has(x.url)).length} de ces pièces ne sont même pas au journal)`);

dire(`\n--- vingt résultats jamais lus ---`);
for (const x of manqueR.slice(0, 20)) dire(`   ${x.t.slice(0, 110)}`);
dire(`\n--- les « autres » : ce que nos deux mots ne classent pas ---`);
for (const x of autres.slice(0, 20)) dire(`   ${x.t.slice(0, 110)}`);
