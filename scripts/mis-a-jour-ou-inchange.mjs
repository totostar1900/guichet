/**
 * « MIS A JOUR » DIT-IL L AGE DU COURS, OU CELUI DE LA SEANCE ?
 *
 * La page du secondaire au desk porte une colonne « Mis a jour » qui
 * affiche « lastPriceOn ». Or ce champ porte la date de la SEANCE, donc
 * celle d aujourd hui des que la ligne parait au bulletin, et il ne dit
 * rien de l age du CHIFFRE. Seul « priceSince » le dit, et il ne bouge
 * qu au changement de cours.
 *
 * Si les deux coincidaient, la colonne serait seulement mal nommee. Si
 * elles divergent, elle ment : elle annonce frais un cours qui ne l est
 * pas, et c est la pire des deux lectures parce qu elle rassure.
 *
 *   npx tsx --conditions=react-server scripts/mis-a-jour-ou-inchange.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const jours = (de, a) => Math.round((Date.parse(a) - Date.parse(de)) / 86_400_000);
const AUJ = new Date().toISOString().slice(0, 10);

const lignes = (await repo().listOffers()).filter((o) => o.kind === "MARCHE");
dire(`${lignes.length} lignes au secondaire\n`);

let mentent = 0;
let sansCote = 0;
let sansAge = 0;
const pires = [];
for (const o of lignes) {
  if (o.bid == null && o.ask == null) sansCote += 1;
  if (!o.priceSince) {
    sansAge += 1;
    continue;
  }
  const ageDuCours = jours(o.priceSince, AUJ);
  const ageDeLaSeance = o.lastPriceOn ? jours(o.lastPriceOn, AUJ) : null;
  /* La colonne ment quand elle annonce frais un cours qui ne l est pas :
     la seance est recente, le chiffre ne l est pas. */
  if (ageDeLaSeance != null && ageDeLaSeance <= 7 && ageDuCours > 30) {
    mentent += 1;
    pires.push({ o, ageDuCours, ageDeLaSeance });
  }
}

dire(`=== ${mentent} ligne(s) ou la colonne annonce frais un cours qui ne l est pas ===`);
dire(`   la seance date de moins de huit jours, le chiffre de plus de trente\n`);
for (const x of pires.sort((a, b) => b.ageDuCours - a.ageDuCours).slice(0, 10)) {
  dire(
    `   ${String(x.o.isin ?? "—").padEnd(14)} cours ${String(x.o.lastPrice ?? "—").padStart(7)} · inchange depuis ${String(x.ageDuCours).padStart(4)} j · ` +
      `« mis a jour » il y a ${x.ageDeLaSeance} j · ${String(x.o.title).slice(0, 34)}`,
  );
}

dire(`\n=== LES DEUX AUTRES COMPTES ===`);
dire(`   ${sansCote} ligne(s) sans acheteur ni vendeur : deux cases vides qu on lit comme un oubli`);
dire(`   ${sansAge} ligne(s) sans date de changement de cours : leur age est inconnu, pas nul`);

const ages = lignes.filter((o) => o.priceSince).map((o) => jours(o.priceSince, AUJ)).sort((a, b) => a - b);
if (ages.length) {
  dire(`\n   age du cours : median ${ages[Math.floor(ages.length / 2)]} j · le plus vieux ${ages.at(-1)} j`);
}
