/**
 * Télécharger les avis d'annonce congolais des quatre lignes en question.
 *
 * L'avis d'annonce porte les modalités de l'emprunt, là où le communiqué de
 * résultats ne porte que les prix. C'est le seul document qui puisse dire si
 * ces lignes se remboursent en une fois ou par tranches, et donc si un
 * rendement de 16 % sur dix-huit mois est le prix de la signature ou un
 * artefact de notre hypothèse.
 *
 *   node scripts/lire-avis-congo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { parseBeacRows, readBeacDoc, BEAC_ANNONCES } from "../src/lib/market/beac.ts";

const out = "C:/Users/Nitch/AppData/Local/Temp/claude/C--Users-Nitch-OneDrive---PURPOSE-CAPITAL-MyChamaProject/019a269f-b7b0-4c63-adce-cddb7ad5ce48/scratchpad/avis";
fs.mkdirSync(out, { recursive: true });

const res = await fetch(BEAC_ANNONCES, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" } });
const docs = parseBeacRows(await res.text()).map(readBeacDoc);

/** Les quatre séances dont le rendement interroge, plus une de contrôle. */
const CIBLES = [
  { on: "2026-09-15", tenor: "6 ans", note: "abondement, 15,36 % sur 1,54 an" },
  { on: "2026-07-21", tenor: "4 ans", note: "abondement, 16,85 % sur 1,48 an" },
  { on: "2026-07-21", tenor: "3 ans", note: "abondement, 10,52 % sur 0,93 an" },
  { on: "2026-07-28", tenor: "2 ans", note: "10,52 % sur 1,93 an" },
  { on: "2026-09-15", tenor: "3 ans", note: "ligne neuve, 9,99 % sur 3,01 ans : le témoin" },
];

console.log("toutes les annonces OTA congolaises de 2026 :");
for (const d of docs.filter(x=>x.country==="Congo"&&x.kind==="annonce"&&x.instrument==="OTA"&&(x.on??"").startsWith("2026")).sort((a,b)=>(a.on??"").localeCompare(b.on??""))) console.log(`   ${d.on} ${d.tenor} ${d.abondement?"abondement":""}`);
console.log();
for (const d of docs.filter(x=>x.country==="Congo"&&x.kind==="annonce"&&x.instrument==="OTA"&&(x.on??"").startsWith("2026"))) {
  const c = { on: d.on, tenor: d.tenor, note: d.abondement ? "abondement" : "ligne neuve" };
  if (!d) {
    console.log(`✗ ${c.on} ${c.tenor} : aucune annonce à l'index`);
    continue;
  }
  const nom = `avis-Congo-${c.on}-${c.tenor.replace(/\s+/g, "")}`;
  const r = await fetch(d.doc.url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } });
  if (!r.ok) {
    console.log(`✗ ${nom} : ${r.status} sur ${d.doc.url}`);
    continue;
  }
  const pdf = path.join(out, `${nom}.pdf`);
  fs.writeFileSync(pdf, Buffer.from(await r.arrayBuffer()));
  console.log(`${nom} · ${fs.statSync(pdf).size} octets · ${c.note}`);
  console.log(`   ${d.doc.title}`);
}
