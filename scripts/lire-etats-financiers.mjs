/**
 * LIRE LES ÉTATS FINANCIERS DES SEPT COTÉES.
 *
 * Quarante-huit pièces sur le disque, dix seulement avec une couche texte :
 * les autres passent par le modèle, comme les communiqués d'adjudication.
 *
 * TROIS PRÉCAUTIONS, LES MÊMES QUE LES AUTRES CAMPAGNES.
 *
 *   ELLE REPREND OÙ ELLE EN ÉTAIT. Une pièce déjà en base n'est pas relue :
 *   quarante-huit lectures de modèle ne se lancent pas deux fois par erreur.
 *
 *   ELLE SE MESURE AVANT DE SE LANCER. « --mesurer n » lit n pièces, écrit, et
 *   dit ce que l'ensemble coûtera. Un coût se chiffre, il ne se suppose pas.
 *
 *   ELLE ÉCRIT AU FUR ET À MESURE. Une campagne qui garde tout en mémoire
 *   jusqu'à la fin perd tout à la première coupure, et c'est déjà arrivé.
 *
 *   npx tsx --conditions=react-server scripts/lire-etats-financiers.mjs [--mesurer 3] [--tout]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const { lireLesComptes, enFrancs } = await import("../src/lib/market/etats-financiers.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";

const args = process.argv.slice(2);
const mesurer = args.includes("--mesurer") ? Number(args[args.indexOf("--mesurer") + 1] ?? 3) : 0;
const toutLire = args.includes("--tout");
if (!mesurer && !toutLire) {
  dire("usage : --mesurer 3   pour chiffrer sur trois pièces, puis --tout");
  process.exit(1);
}

const index = new Map((await tout(sb, "library_items", "file_key, library_path")).map((x) => [x.file_key, x.library_path]));
const docs = (await tout(sb, "issuer_documents", "id, mnemo, kind, year, title, file_key, source_url")).filter((d) =>
  ["etats_ohada", "etats_ifrs", "rapport_semestriel", "rapport_gestion"].includes(d.kind),
);
const dejaLus = new Set((await tout(sb, "issuer_financials", "document_id")).map((x) => x.document_id));

const file = docs
  .filter((d) => !dejaLus.has(d.id))
  .map((d) => ({ ...d, chemin: d.file_key ? index.get(storageKey(d.file_key)) : undefined }))
  .filter((d) => d.chemin && fs.existsSync(`${BIBLIO}/${d.chemin}`))
  /* Les plus récentes d'abord : c'est le P/E d'aujourd'hui qui manque. */
  .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.mnemo.localeCompare(b.mnemo));

dire(`${docs.length} pièce(s) de comptes · ${dejaLus.size} déjà lue(s) · ${file.length} à lire\n`);
const lot = mesurer ? file.slice(0, mesurer) : file;

let jetonsE = 0;
let jetonsS = 0;
let lues = 0;
let ratees = 0;
for (const d of lot) {
  const octets = fs.statSync(`${BIBLIO}/${d.chemin}`).size;
  let r;
  const debut = Date.now();
  try {
    r = await lireLesComptes(fs.readFileSync(`${BIBLIO}/${d.chemin}`).toString("base64"));
  } catch (e) {
    ratees++;
    dire(`   ÉCHEC  ${d.mnemo.padEnd(7)} ${String(d.year ?? "?").padEnd(5)} ${String(e.message).slice(0, 90)}`);
    continue;
  }
  jetonsE += r.jetons.entree;
  jetonsS += r.jetons.sortie;
  lues++;
  const rn = enFrancs(r.resultatNet, r.unite);
  const cp = enFrancs(r.capitauxPropres, r.unite);
  const ca = enFrancs(r.chiffreAffaires, r.unite);
  dire(
    `   ${d.mnemo.padEnd(7)} ${String(r.exercice ?? d.year ?? "?").padEnd(5)} ${r.referentiel.padEnd(6)} ` +
      `RN ${rn == null ? "—" : (rn / 1e9).toFixed(2).padStart(8)} Mds · CP ${cp == null ? "—" : (cp / 1e9).toFixed(2).padStart(8)} · CA ${ca == null ? "—" : (ca / 1e9).toFixed(2).padStart(8)} · ` +
      `${Math.round(octets / 1024)} Ko, ${r.jetons.entree} jetons, ${Math.round((Date.now() - debut) / 1000)} s`,
  );
  for (const x of r.remarques) dire(`          ↳ ${x.slice(0, 110)}`);

  const { error } = await sb.from("issuer_financials").upsert(
    {
      document_id: d.id,
      mnemo: d.mnemo,
      exercice: r.exercice ?? d.year ?? null,
      referentiel: r.referentiel,
      unite: r.unite,
      resultat_net: rn ?? null,
      resultat_net_precedent: enFrancs(r.resultatNetPrecedent, r.unite) ?? null,
      capitaux_propres: cp ?? null,
      chiffre_affaires: ca ?? null,
      nombre_actions: r.nombreActions ?? null,
      resultat_par_action: r.resultatParAction ?? null,
      remarques: r.remarques.length ? r.remarques.join(" · ") : null,
      source_titre: d.title,
      source_url: d.source_url ?? null,
      file_key: d.file_key ?? null,
      lu_le: new Date().toISOString(),
      lu_par: r.modele,
    },
    { onConflict: "document_id" },
  );
  if (error) dire(`          ↳ ÉCRITURE : ${error.message}`);
}

dire(`\n=== ${lues} lue(s), ${ratees} en échec ===`);
dire(`   jetons : ${jetonsE.toLocaleString("fr-FR")} en entrée, ${jetonsS.toLocaleString("fr-FR")} en sortie`);
if (lues) {
  const parPiece = jetonsE / lues;
  dire(`   soit ${Math.round(parPiece).toLocaleString("fr-FR")} jetons d'entrée par pièce`);
  if (mesurer) dire(`\n   LES ${file.length} PIÈCES COÛTERAIENT ENVIRON ${Math.round((parPiece * file.length) / 1000).toLocaleString("fr-FR")} MILLIERS DE JETONS D'ENTRÉE.`);
}
