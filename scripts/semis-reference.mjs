/**
 * Verser les données de référence de la production dans le jeu de départ.
 *
 *   node scripts/semis-reference.mjs           lit et compte, n'écrit rien
 *   node scripts/semis-reference.mjs --ecrire  écrit src/data/reference.json
 *
 * POURQUOI CE FICHIER EXISTE
 *
 * L'environnement d'essai tourne en mémoire : sans `NEXT_PUBLIC_SUPABASE_URL`,
 * l'application bascule d'elle-même sur son propre jeu de données et ne peut
 * plus atteindre la production, par construction et non par précaution. Le jeu
 * de démonstration, lui, porte huit lignes : assez pour juger une mise en page,
 * beaucoup trop maigre pour juger une liste à trois vues, un tri sur huit clefs
 * et un groupement par émetteur. On juge mal une densité qu'on n'a pas.
 *
 * CE QUI PART, ET CE QUI NE PART PAS
 *
 * Partent : les lignes du catalogue et les séances d'adjudication relues. Ce
 * sont des données de marché, publiées par les Trésors et par la BVMAC.
 *
 * Ne partent JAMAIS : les clients, les intentions, les documents, les dossiers,
 * les espèces, les messages. Le script ne lit pas ces tables, il ne les
 * nomme pas, et c'est voulu : une liste blanche de deux tables se relit d'un
 * coup d'oeil, une liste noire des tables à éviter se périme au premier ajout.
 *
 * Ce qui reste d'une personne dans les deux tables retenues est effacé au
 * passage : qui a mis une ligne « à la une », qui a relu une séance. Le fait
 * qu'une séance SOIT relue compte pour l'affichage, le nom de qui l'a relue ne
 * compte pas.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ecrire = process.argv.includes("--ecrire");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local");

/** Les deux seules tables lues. Toute autre demande une modification ici. */
const TABLES = ["offers", "auction_results"];

async function lire(table) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const r = await fetch(`${URL_}/rest/v1/${table}?select=*&order=id.asc`, {
      headers: { apikey: KEY, authorization: `Bearer ${KEY}`, range: `${de}-${de + 999}`, prefer: "count=exact" },
    });
    if (!r.ok) throw new Error(`${table} : HTTP ${r.status} ${await r.text()}`);
    const lot = await r.json();
    out.push(...lot);
    if (lot.length < 1000) break;
  }
  return out;
}

/** « coupon_rate » devient « couponRate ». Les clefs déjà camel ne bougent pas. */
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

/**
 * Le passage d'une rangée à un objet de l'application.
 *
 * Deux règles seulement, et elles suffisent parce que le compilateur vérifie
 * le reste : une clef nulle disparaît plutôt que de valoir `null`, et une
 * valeur numérique rendue en chaîne par PostgREST redevient un nombre. Si la
 * forme dérive, `npx tsc` le dira sur `src/data/reference.ts`.
 */
function objet(row, numeriques) {
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) continue;
    const c = camel(k);
    o[c] = numeriques.has(c) ? Number(v) : v;
  }
  return o;
}

const NOMBRES_OFFRE = new Set(["nominal", "couponRate", "precountRate", "pricePct", "servedPricePct", "commissionPct", "minTitles", "pricePerShare", "shares", "sharesOffered"]);
const NOMBRES_SEANCE = new Set(["announced", "bid", "served", "networkSize", "bidders", "rateMin", "rateMax", "rateLimit", "rateAvg", "priceMin", "priceMax", "priceLimit", "priceAvg", "coupon", "nominalUnit"]);

const offresBrutes = await lire("offers");
const seancesBrutes = await lire("auction_results");

const offres = offresBrutes.map((r) => {
  const o = objet(r, NOMBRES_OFFRE);
  // Qui a mis une ligne « à la une » ne regarde pas un environnement d'essai.
  delete o.featured;
  // Les pièces restent nommées, leurs clefs de stockage partent : le dépôt de
  // fichiers n'existe pas en mémoire, et un lien mort vaut mieux qu'une clef.
  if (Array.isArray(o.documents)) o.documents = o.documents.map((d) => ({ ...d, fileKey: undefined, key: undefined }));
  return o;
});

const seances = seancesBrutes.map((r) => {
  const s = objet(r, NOMBRES_SEANCE);
  // Qu'une séance soit relue compte pour l'affichage ; le nom de qui l'a relue
  // ne compte pas, et ne sort pas.
  if (s.confirmedBy) s.confirmedBy = "desk";
  if (s.readBy) s.readBy = "machine";
  if (s.setAsideBy) s.setAsideBy = "desk";
  return s;
});

const relues = seances.filter((s) => s.confirmedBy && !s.setAsideAt).length;
console.log(`offers          : ${offres.length}`);
console.log(`auction_results : ${seances.length} dont ${relues} relues et non écartées`);
console.log(`tables lues     : ${TABLES.join(", ")} — aucune autre`);

const json = JSON.stringify({ genere: new Date().toISOString().slice(0, 10), offres, seances }, null, 1);
console.log(`poids           : ${Math.round(json.length / 1024)} Ko`);

if (!ecrire) {
  console.log("\nRien écrit. Relancer avec --ecrire pour poser src/data/reference.json");
} else {
  writeFileSync(new URL("../src/data/reference.json", import.meta.url), json + "\n", "utf8");
  console.log("\nsrc/data/reference.json écrit.");
}
