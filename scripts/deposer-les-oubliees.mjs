/**
 * DÉPOSER LES SÉANCES QUE LE ROBOT VOYAIT SANS LES COMPRENDRE.
 *
 * Deux portes étaient fermées sur la page des annonces, et elles viennent de
 * s'ouvrir : la colonne de droite, qui n'est pas un tableau, et les titres
 * anglais du Trésor camerounais, qu'aucun mot du lecteur ne reconnaissait.
 * Cinquante-sept pièces sont donc lisibles aujourd'hui qui ne l'étaient pas
 * hier, dont des résultats d'adjudication de 2019.
 *
 * Le robot quotidien ne les reprendra pas de lui-même : il ne dépose que ce
 * qui est devant lui, ou ce qu'un « depuis » lui désigne. Ce script fait la
 * reprise, UNE FOIS, et s'arrête là.
 *
 * IL N'ÉCRIT AUCUN CHIFFRE. Comme le robot, il dépose l'identité de la séance,
 * lue dans le titre, et laisse les montants vides : ils sont dans un scan, et
 * une lecture que personne n'a relue ne doit servir de référence à rien.
 *
 * LA PIÈCE N'EST PAS REPRISE SUR LE RÉSEAU : elle est déjà dans la
 * bibliothèque, ramassée par le journal. On pose la clef que l'index sait
 * résoudre, et l'indexeur fait le lien.
 *
 *   npx tsx --conditions=react-server scripts/deposer-les-oubliees.mjs [--deposer]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { BEAC_ANNONCES, parseBeacRows, readBeacDoc } = await import("../src/lib/market/beac.ts");
const { tout } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const deposer = process.argv.includes("--deposer");

const html = await fetch(BEAC_ANNONCES, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => r.text());
const lus = parseBeacRows(html).map(readBeacDoc);
dire(`${lus.length} document(s) lus sur la page`);

const absolue = (u) => (u.startsWith("http") ? u : `https://www.beac.int${u}`);
const dejaR = new Set((await tout(sb, "auction_results", "source_url")).map((x) => x.source_url));
const dejaA = new Set((await tout(sb, "emission_notices", "source_url")).map((x) => x.source_url));

/** La clef de dépôt d'une pièce BEAC, telle que l'indexeur la calcule. */
const clefDe = (url) => `beac/${decodeURIComponent(url.split("/").pop() ?? "")}`;

/* UNE SÉANCE SANS INSTRUMENT, SANS DATE OU SANS PAYS N'EST PAS UNE SÉANCE.
   Les syndications et les rachats tombent ici, et c'est juste : ce ne sont pas
   des adjudications, et les ranger comme telles fausserait les comptes. */
const complete = (a) => a.on && a.country && (a.instrument === "BTA" || a.instrument === "OTA");
const resultats = lus.filter((a) => a.kind === "resultats" && complete(a) && !dejaR.has(absolue(a.doc.url)) && !dejaR.has(a.doc.url));
const annonces = lus.filter((a) => a.kind === "annonce" && complete(a) && !dejaA.has(absolue(a.doc.url)) && !dejaA.has(a.doc.url));
const refusees = lus.filter((a) => (a.kind === "resultats" || a.kind === "annonce") && !complete(a));

dire(`\n   ${resultats.length} résultat(s) à déposer`);
for (const a of resultats) dire(`      ${a.on} ${String(a.country).padEnd(12)} ${a.instrument} ${a.tenor ?? "—"}   ${a.doc.title.slice(0, 70)}`);
dire(`\n   ${annonces.length} annonce(s) à déposer`);
for (const a of annonces.slice(0, 12)) dire(`      ${a.on} ${String(a.country).padEnd(12)} ${a.instrument} ${a.tenor ?? "—"}   ${a.doc.title.slice(0, 70)}`);
if (annonces.length > 12) dire(`      … et ${annonces.length - 12} autres`);
dire(`\n   ${refusees.length} pièce(s) refusée(s), faute d'identité complète`);
for (const a of refusees) dire(`      ${a.doc.title.slice(0, 80)}  (${a.on ?? "sans date"} · ${a.instrument ?? "sans instrument"} · ${a.country ?? "sans pays"})`);

if (!deposer) {
  dire(`\nEssai à blanc. Relancer avec --deposer.`);
  process.exit(0);
}

const maintenant = new Date().toISOString();

/**
 * CE SCRIPT NE POSE PAS DE CODE D'ÉMISSION, donc il ne peut pas se servir de
 * la clef (pays, séance, code) de la migration 0108 : un index unique tient
 * deux nuls pour distincts, et un « upsert » sur cette clef insérerait un
 * doublon à chaque passage au lieu de s'arrêter. Il ne peut pas davantage
 * viser l'adresse de la pièce, dont 0108 a retiré l'unicité.
 *
 * Il dépose une COQUILLE pour une séance qu'on ne connaissait pas. La bonne
 * question est donc celle du jour : si la séance existe déjà, sous quelque
 * code que ce soit, il n'y a rien à créer et surtout rien à réécrire. La
 * campagne du 16 octobre a montré ce que coûte l'autre réponse : trente-neuf
 * lignes écrasées, dix-neuf signatures laissées sur des chiffres changés.
 */
const dejaLa = new Set(
  (await tout(sb, "auction_results", "country, session_on")).map((r) => `${r.country}|${r.session_on}`),
);

let nR = 0;
let nDeja = 0;
for (const a of resultats) {
  if (dejaLa.has(`${a.country}|${a.on}`)) { nDeja++; continue; }
  const { error } = await sb.from("auction_results").insert(
    {
      country: a.country,
      instrument: a.instrument,
      tenor: a.tenor ?? "—",
      session_on: a.on,
      abondement: a.abondement,
      source_url: absolue(a.doc.url),
      source_title: a.doc.title,
      file_key: clefDe(a.doc.url),
      updated_at: maintenant,
    },
  );
  if (error) dire(`   résultat ${a.on} : ${error.message}`);
  else nR++;
}
if (nDeja) dire(`   ${nDeja} séance(s) déjà en table, laissée(s) intactes`);
let nA = 0;
for (const a of annonces) {
  const { error } = await sb.from("emission_notices").upsert(
    {
      country: a.country,
      instrument: a.instrument,
      tenor: a.tenor ?? "—",
      session_on: a.on,
      abondement: a.abondement,
      source_url: absolue(a.doc.url),
      source_title: a.doc.title,
      file_key: clefDe(a.doc.url),
      updated_at: maintenant,
    },
    /* ICI L'ADRESSE EST BIEN LA CLEF, et c'est propre à cette table :
       `emission_notices_source_url_key` existe toujours. La migration 0108
       n'a retiré l'unicité de l'adresse que sur `auction_results`, parce
       qu'une séance y est décrite par plusieurs pièces. Appliquer la règle
       d'une table à sa voisine est la faute qui a produit ce commentaire. */
    { onConflict: "source_url" },
  );
  if (error) dire(`   annonce ${a.on} : ${error.message}`);
  else nA++;
}
dire(`\n=== ${nR} résultat(s) et ${nA} annonce(s) déposé(s) ===`);
dire(`Penser à relancer l'indexeur, sans quoi la clef ne pointe nulle part.`);
