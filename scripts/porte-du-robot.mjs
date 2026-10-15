/**
 * POURQUOI VINGT-TROIS COMMUNIQUÉS N'ONT JAMAIS ÉTÉ LUS.
 *
 * La page des annonces porte 1 002 documents ; le robot en déclare bien moins.
 * Deux portes peuvent se fermer : le TITRE, que le robot doit savoir lire, et
 * la FORME DE LA PAGE, dont il ne prend que les lignes d'un tableau. Georges
 * signale une colonne de droite : ce n'est pas un tableau, c'est une liste.
 *
 * ON NE CHOISIT PAS ENTRE LES DEUX EXPLICATIONS, ON LES SÉPARE : pour chaque
 * pièce jamais lue, le robot la VOIT-IL, et s'il la voit, que COMPREND-IL ?
 *
 *   npx tsx --conditions=react-server scripts/porte-du-robot.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { BEAC_ANNONCES, parseBeacRows, readBeacDoc } = await import("../src/lib/market/beac.ts");
const { tout } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const html = await fetch(BEAC_ANNONCES, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => r.text());

/* Tous les liens de la page, toutes formes confondues. */
const tous = new Map();
for (const m of html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]{0,250}?)<\/a>/gi)) {
  const url = m[1].startsWith("http") ? m[1] : `https://www.beac.int${m[1]}`;
  if (!tous.has(url)) tous.set(url, m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#8217;|&rsquo;/g, "'").replace(/\s+/g, " ").trim());
}
const vuesParLeRobot = new Map(parseBeacRows(html).map((d) => [d.url.startsWith("http") ? d.url : `https://www.beac.int${d.url}`, d]));
dire(`${tous.size} lien(s) sur la page · ${vuesParLeRobot.size} vue(s) par le robot · ${tous.size - vuesParLeRobot.size} HORS DE SA VUE\n`);

const lus = new Set([...(await tout(sb, "auction_results", "source_url")), ...(await tout(sb, "emission_notices", "source_url"))].map((x) => x.source_url).filter(Boolean));

const RESULTAT = /r[ée]sultats?/i;
const ANNONCE = /annonce|announcement/i;
let horsVue = 0;
let vuMalCompris = 0;
for (const [url, t] of tous) {
  if (!RESULTAT.test(t) && !ANNONCE.test(t)) continue;
  if (lus.has(url)) continue;
  const vu = vuesParLeRobot.get(url);
  if (!vu) {
    horsVue++;
    dire(`   HORS DE SA VUE   ${t.slice(0, 100)}`);
    continue;
  }
  vuMalCompris++;
  const d = readBeacDoc(vu);
  dire(`   VU MAIS          ${t.slice(0, 70)}`);
  dire(`                    genre ${d.kind} · ${d.instrument ?? "instrument ?"} · ${d.tenor ?? "ténor ?"} · ${d.on ?? "DATE ?"} · ${d.country ?? "PAYS ?"}`);
}
dire(`\n=== ${horsVue} hors de sa vue · ${vuMalCompris} vues mais pas déposées ===`);
