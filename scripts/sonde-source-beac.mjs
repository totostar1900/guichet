/**
 * LA SOURCE A-T-ELLE CESSE DE PUBLIER, OU AVONS-NOUS CESSE DE VOIR ?
 *
 * Rien d annonce ni de resultat depuis le 22 septembre, alors que le robot
 * passe tous les jours. Les deux explications n ont rien a voir :
 *
 *   la BEAC ne publie plus     c est un fait sur le marche
 *   nous ne voyons plus        c est un fait sur nous
 *
 * Et le contrôle de fraicheur ne les distingue pas : il mesure que le robot
 * a TOURNE, pas qu il a TROUVE. On va donc chercher la page nous-memes et
 * compter ce qu elle porte, par mois.
 *
 *   npx tsx --conditions=react-server scripts/sonde-source-beac.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { BEAC_ANNONCES, parseBeacRows, readBeacDoc } = await import("../src/lib/market/beac.ts");
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

dire(`on va chercher ${BEAC_ANNONCES}\n`);
const t0 = Date.now();
const res = await fetch(BEAC_ANNONCES, {
  headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" },
  cache: "no-store",
});
const texte = await res.text();
dire(`reponse ${res.status} en ${Date.now() - t0} ms · ${Math.round(texte.length / 1024)} Ko`);

const rows = parseBeacRows(texte);
dire(`${rows.length} lignes lues sur la page\n`);

const lus = rows.map(readBeacDoc);
const parMois = new Map();
for (const a of lus) {
  const m = a.on ? String(a.on).slice(0, 7) : "(sans date)";
  if (!parMois.has(m)) parMois.set(m, { annonce: 0, resultats: 0, autre: 0 });
  const c = parMois.get(m);
  c[a.kind === "annonce" ? "annonce" : a.kind === "resultats" ? "resultats" : "autre"] += 1;
}
dire(`=== CE QUE LA PAGE PORTE, PAR MOIS (douze derniers) ===`);
const mois = [...parMois.keys()].filter((m) => m !== "(sans date)").sort().slice(-12);
for (const m of mois) {
  const c = parMois.get(m);
  dire(`   ${m}   ${String(c.annonce).padStart(3)} annonce(s) · ${String(c.resultats).padStart(3)} resultat(s) · ${String(c.autre).padStart(3)} autre(s)`);
}
const sansDate = parMois.get("(sans date)");
if (sansDate) dire(`   sans date   ${sansDate.annonce + sansDate.resultats + sansDate.autre} piece(s)`);

/* CE QUE NOUS EN AVONS. La difference entre les deux colonnes est le
   diagnostic : si la page porte des pieces recentes que la base n a pas,
   c est nous ; si la page n en porte pas, c est la source. */
/* ON PAGINE, ET LA PREMIERE VERSION NE LE FAISAIT PAS. Supabase plafonne a
   mille lignes SANS LE DIRE : la base porte 2 311 observations, le set n en
   contenait que mille, et la sonde annoncait 626 pieces jamais vues. Une
   fausse alerte sur un instrument de diagnostic est pire qu une absence d
   instrument, puisqu on la croit. */
const vues = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_observations").select("url").range(de, de + 999);
  if (error) throw new Error(error.message);
  vues.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
dire(`${vues.length} observations lues en base (paginees)`);
const connues = new Set(vues.map((v) => v.url));
const absolue = (u) => (String(u).startsWith("http") ? u : `https://www.beac.int${u}`);
const nouvelles = lus.filter((a) => !connues.has(a.doc.url) && !connues.has(absolue(a.doc.url)));

dire(`\n=== LE DIAGNOSTIC ===`);
dire(`   la page porte          ${lus.length} pieces`);
dire(`   la base en connait     ${lus.length - nouvelles.length}`);
dire(`   JAMAIS VUES            ${nouvelles.length}`);
for (const a of nouvelles.slice(0, 15)) dire(`      ${a.on ?? "sans date"}  ${a.kind.padEnd(10)} ${String(a.doc.title).slice(0, 86)}`);
if (nouvelles.length > 15) dire(`      … et ${nouvelles.length - 15} autres`);

const recentes = lus.filter((a) => a.on && a.on > "2026-09-22");
dire(`\n   pieces de la page posterieures au 22 septembre : ${recentes.length}`);
for (const a of recentes.slice(0, 10)) dire(`      ${a.on}  ${a.kind.padEnd(10)} ${String(a.doc.title).slice(0, 86)}`);
