/**
 * RELIRE LES SÉANCES DE 2023 AVEC LE LECTEUR v8. CELUI-CI ÉCRIT.
 *
 * Autorisé par Georges le 12 octobre 2026, après la mesure. Les trois fenêtres
 * du balayage ont comparé les deux versions du lecteur sur le même texte, dans
 * le même processus, sans rien écrire :
 *
 *   2023, 123 séances      +68 obligations    0 perdue   0 changée
 *   2024, 245 séances       +0                0 perdue   0 changée
 *   2025 et 2026, 440       +0                0 perdue   0 changée
 *
 * TOUT LE GAIN EST EN 2023, donc on ne relit que 2023 : vingt minutes de
 * machine au lieu de deux heures, pour exactement le même résultat.
 *
 * ON N'ITÈRE PAS SUR LE CALENDRIER mais sur les séances connues : backfill
 * essaierait les deux cent soixante jours ouvrés de l'année et irait
 * redemander à la bourse les cent trente-sept qui n'ont pas de bulletin.
 *
 * Une relecture AJOUTE et CORRIGE, elle ne retire jamais : une cotation
 * retrouvée écrase la sienne, une cotation que le lecteur ne retrouve pas
 * reste en place.
 *
 *   npx tsx --conditions=react-server scripts/relire-2023.mjs [--vraiment]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { ingestBoc } = await import("../src/lib/market/boc.ts");
const { VERSION_DU_LECTEUR } = await import("../src/lib/market/lecteur-version.ts");
const { repo } = await import("../src/lib/data/index.ts");

const vraiment = process.argv.includes("--vraiment");
const r = repo();

/* Des dates nommées en argument reprennent celles-là seulement : c'est ce qui
   sert à rejouer les séances tombées en échec, sans repasser sur les cent
   vingt autres. */
const nommees = process.argv.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
/* LE MÊME CRIBLE AVANT ET APRÈS, sans quoi le bilan compare trois séances à
   cent vingt-quatre et annonce « +1 429 obligations » pour une reprise de
   trois dates. Mesuré en le faisant. */
const retenue = (b) => (nommees.length ? nommees.includes(b.sessionDate) : b.sessionDate >= "2023-01-01" && b.sessionDate <= "2023-12-31");
const avant = (await r.listBulletins(2000)).filter(retenue).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

const somme = (lot, clef) => lot.reduce((s, b) => s + (b.counts?.[clef] ?? 0), 0);
console.log(`${avant.length} séances de 2023 en base`);
console.log(`   obligations ${somme(avant, "bonds")} · actions ${somme(avant, "equities")} · OPCVM ${somme(avant, "funds")}`);
console.log(`   versions du lecteur : ${JSON.stringify(avant.reduce((a, b) => ({ ...a, [b.readerVersion ?? "aucune"]: (a[b.readerVersion ?? "aucune"] ?? 0) + 1 }), {}))}`);
console.log(`   lecteur courant : v${VERSION_DU_LECTEUR}\n`);

if (!vraiment) {
  console.log("Rien n'a été écrit. Relancer avec --vraiment pour écrire en base.");
  process.exit(0);
}

console.log(`ÉCRITURE EN BASE. ${avant.length} séances, dans l'ordre chronologique.\n`);
const debut = Date.now();
let faites = 0;
const rates = [];

for (const b of avant) {
  try {
    const res = await ingestBoc({ sessionDate: b.sessionDate, by: "desk" });
    faites++;
    if (res.error) rates.push(`${b.sessionDate} : ${res.error}`);
  } catch (e) {
    rates.push(`${b.sessionDate} : ${e.message}`);
  }
  if (faites % 10 === 0 || faites === avant.length) {
    const ecoule = Math.round((Date.now() - debut) / 1000);
    console.log(`   ${faites}/${avant.length} · ${ecoule} s écoulées · ${rates.length} en échec`);
  }
}

const apres = (await r.listBulletins(2000)).filter(retenue);
console.log(`\n=== APRÈS ===\n`);
console.log(`   obligations ${somme(avant, "bonds")} → ${somme(apres, "bonds")}   (${somme(apres, "bonds") - somme(avant, "bonds") >= 0 ? "+" : ""}${somme(apres, "bonds") - somme(avant, "bonds")})`);
console.log(`   actions     ${somme(avant, "equities")} → ${somme(apres, "equities")}   (${somme(apres, "equities") - somme(avant, "equities") >= 0 ? "+" : ""}${somme(apres, "equities") - somme(avant, "equities")})`);
console.log(`   OPCVM       ${somme(avant, "funds")} → ${somme(apres, "funds")}   (${somme(apres, "funds") - somme(avant, "funds") >= 0 ? "+" : ""}${somme(apres, "funds") - somme(avant, "funds")})`);
console.log(`   versions    ${JSON.stringify(apres.reduce((a, x) => ({ ...a, [x.readerVersion ?? "aucune"]: (a[x.readerVersion ?? "aucune"] ?? 0) + 1 }), {}))}`);
if (rates.length) {
  console.log(`\n   ${rates.length} séance(s) en échec :`);
  for (const x of rates) console.log(`      ${x}`);
}
