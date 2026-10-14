/**
 * RELIER CHAQUE CLEF DE DÉPÔT À SA PLACE DANS LA BIBLIOTHÈQUE.
 *
 * C'est le pas qui rend le ménage possible. Tant que la base ne sait pas où
 * une pièce vit dans la bibliothèque, retirer ses octets du dépôt revient à
 * la perdre. Une fois le lien écrit et VÉRIFIÉ SUR LE DISQUE, le desk peut
 * renvoyer au lieu de recopier.
 *
 * ON NE RECALCULE PAS LES NOMS, ON LIT L'INVENTAIRE. Les deux ramasseurs ont
 * écrit, ligne par ligne, où chaque pièce est allée, avec son poids et son
 * empreinte. Refaire le calcul de mon côté, c'est se donner une troisième
 * copie de la règle de nommage, et la première version de ce script l'a
 * prouvé : elle plaçait deux images de la BANGE au même endroit et manquait
 * 563 pièces BEAC sur 653. L'inventaire, lui, dit ce qui a été écrit.
 *
 * LA CLEF EST LA CLEF DU DÉPÔT, PAS CELLE DE LA TABLE. Le dépôt refuse un
 * caractère non ASCII, donc « Communiqué-des-résultats.pdf » y vit sous
 * « Communique-des-resultats.pdf » tandis que la table garde la forme
 * accentuée. Tout se range ici sous la forme du dépôt, et toute lecture passe
 * donc par `storageKey()`, exactement comme `readSource`.
 *
 *   npx tsx --conditions=react-server scripts/indexer-bibliotheque.mjs [--ecrire]
 */
import fs from "node:fs";
import { createHash } from "node:crypto";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const SOUS = "1. Donnees de marche";
const INVENTAIRE = `${RACINE}/${SOUS}/9. Index/inventaire.csv`;

/* L'inventaire : une ligne par pièce rangée, la dernière colonne disant d'où
   elle vient. Deux provenances, deux ponts vers la clef du dépôt. */
const lignesCsv = fs.readFileSync(INVENTAIRE, "utf8").split(/\r?\n/).slice(1).filter(Boolean);
dire(`${lignesCsv.length} ligne(s) d'inventaire\n`);

const parCle = new Map();
let sansPont = 0;
for (const l of lignesCsv) {
  const c = l.split(";");
  const chemin = c[4];
  const origine = c[7];
  if (!chemin || !origine) continue;
  let cle;
  if (origine.startsWith("supabase:sources/")) {
    /* Déjà une clef de dépôt : on la normalise comme le dépôt la range. */
    cle = storageKey(origine.slice("supabase:sources/".length));
  } else if (origine.startsWith("http")) {
    /* Une pièce BEAC : sa clef est « beac/ » plus le nom du fichier distant. */
    cle = storageKey(`beac/${decodeURIComponent(origine.split("/").pop() ?? "")}`);
  } else {
    sansPont++;
    continue;
  }
  /* Une pièce reprise deux fois a deux lignes : la dernière fait foi. */
  parCle.set(cle, { chemin: `${SOUS}/${chemin}`, octets: Number(c[5]) || undefined });
}
dire(`${parCle.size} clef(s) de dépôt reliées par l'inventaire${sansPont ? `, ${sansPont} ligne(s) sans provenance` : ""}`);

/**
 * LE SECOND PONT : L'ADRESSE SOURCE, ET IL FAUT LES DEUX.
 *
 * Une même pièce de la BEAC est entrée au dépôt par deux voies qui ne se
 * parlaient pas : le robot des adjudications et celui des avis d'émission,
 * chacun avec sa façon de nommer (« 2024-01-29-annonce-RCA-26semaines-… »
 * contre le nom du fichier distant). Le nom ne les rapproche donc pas, mais
 * l'ADRESSE SOURCE est la même des deux côtés, et c'est elle qui fait foi :
 * c'est la pièce elle-même, pas la façon dont nous l'avons appelée.
 *
 * Sans ce pont, 385 objets restaient sans place dans la bibliothèque alors
 * qu'ils y sont déjà, rangés sous l'autre nom.
 */
const parUrl = new Map();
for (const l of lignesCsv) {
  const c = l.split(";");
  if (c[7]?.startsWith("http")) parUrl.set(c[7], { chemin: `${SOUS}/${c[4]}`, octets: Number(c[5]) || undefined });
}
async function toutes(t, c) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(t).select(c).range(de, de + 999);
    if (error) break;
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}
let parAdresse = 0;
for (const t of ["auction_results", "emission_notices"]) {
  for (const r of await toutes(t, "file_key, source_url")) {
    if (!r.file_key || !r.source_url) continue;
    const cle = storageKey(r.file_key);
    if (parCle.has(cle)) continue;
    const place = parUrl.get(r.source_url);
    if (!place) continue;
    parCle.set(cle, place);
    parAdresse++;
  }
}
dire(`${parAdresse} clef(s) reliées en plus par l'adresse source`);

/* CE QUE LE DÉPÔT PORTE VRAIMENT : l'inventaire dit ce qui a été écrit, le
   dépôt dit ce qui reste à relier. L'écart entre les deux est le sujet. */
async function parcourir(prefixe, profondeur = 0) {
  const out = [];
  for (let de = 0; ; de += 100) {
    const { data, error } = await sb.storage.from("sources").list(prefixe, { limit: 100, offset: de });
    if (error) break;
    for (const o of data ?? []) {
      const cle = prefixe ? `${prefixe}/${o.name}` : o.name;
      if (o.id === null && profondeur < 4) out.push(...(await parcourir(cle, profondeur + 1)));
      else if (o.id) out.push({ cle, octets: o.metadata?.size ?? 0 });
    }
    if ((data ?? []).length < 100) break;
  }
  return out;
}
const lot = await parcourir("");
dire(`${lot.length} objet(s) au dépôt\n`);

const GARDEES = /^(kyc|courrier|docs)\//;
const a = [];
let absentes = 0;
let gardees = 0;
let sansLien = 0;
const ecarts = [];

for (const o of lot) {
  if (GARDEES.test(o.cle)) {
    gardees++;
    continue;
  }
  const place = parCle.get(o.cle);
  if (!place) {
    sansLien++;
    if (sansLien <= 6) dire(`   SANS LIEN  ${o.cle}`);
    continue;
  }
  const surDisque = `${RACINE}/${place.chemin}`;
  if (!fs.existsSync(surDisque)) {
    absentes++;
    if (absentes <= 6) dire(`   ABSENTE DU DISQUE  ${o.cle}\n      attendue : ${place.chemin}`);
    continue;
  }
  const buf = fs.readFileSync(surDisque);
  /* LE POIDS EST LE SEUL CONTRÔLE QUI VAILLE : un fichier de la bibliothèque
     qui ne pèse pas ce que pèse l'objet du dépôt n'est pas le même fichier, et
     le lien mènerait ailleurs que la lecture. */
  if (o.octets && Math.abs(o.octets - buf.length) > 0) ecarts.push({ cle: o.cle, depot: o.octets, biblio: buf.length, chemin: place.chemin });
  a.push({ file_key: o.cle, library_path: place.chemin, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), au_depot: true });
}

dire(`\n=== L'INDEX ===`);
dire(`   pièces reliées et relues sur le disque   ${a.length}`);
dire(`   pièces gardées au dépôt par décision     ${gardees}   (clients, courrier, documents produits)`);
dire(`   pièces du dépôt sans lien connu          ${sansLien}`);
dire(`   pièces absentes du disque                ${absentes}`);
dire(`   ÉCARTS DE POIDS                          ${ecarts.length}`);
for (const e of ecarts.slice(0, 10)) dire(`      ${e.cle}\n         dépôt ${e.depot} octets · bibliothèque ${e.biblio} · ${e.chemin}`);

if (!ecrire) {
  dire(`\nEssai à blanc. Relancer avec --ecrire pour remplir library_items.`);
  process.exit(0);
}
if (ecarts.length) {
  dire(`\nREFUS D'ÉCRIRE : ${ecarts.length} pièce(s) ne pèsent pas le même poids des deux côtés.`);
  dire(`Un index qui pointe sur un autre fichier est pire qu'un index absent.`);
  process.exit(1);
}

for (let i = 0; i < a.length; i += 200) {
  const { error } = await sb.from("library_items").upsert(a.slice(i, i + 200), { onConflict: "file_key" });
  if (error) throw new Error(error.message);
  dire(`   ${Math.min(i + 200, a.length)}/${a.length} écrite(s)`);
}
const { count } = await sb.from("library_items").select("file_key", { count: "exact", head: true });
dire(`\n${count} ligne(s) dans library_items.`);
