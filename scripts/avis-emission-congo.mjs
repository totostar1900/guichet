/**
 * Chercher les avis d'annonce congolais, qui portent les modalités.
 *
 * Le communiqué de résultats dit qui a acheté quoi et à quel prix ; il ne dit
 * jamais comment le titre se rembourse. L'avis d'annonce, publié une semaine
 * avant la séance, porte les modalités de l'emprunt, et c'est là que devrait
 * figurer « remboursement in fine » ou un amortissement par tranches après
 * différé.
 *
 * La question est ouverte parce que le rendement de deux abondements congolais
 * ressort à 15 et 17 % sur dix-huit mois, contre 10 % sur leur trois ans. Ou
 * bien la signature se paie ce prix, ou bien ces lignes s'amortissent et un
 * prix de 90 porte sur un nominal déjà partiellement remboursé.
 *
 *   node scripts/avis-emission-congo.mjs
 */
import { parseBeacRows, readBeacDoc, BEAC_ANNONCES } from "../src/lib/market/beac.ts";

const res = await fetch(BEAC_ANNONCES, {
  headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" },
});
console.log(`BEAC : ${res.status}`);
const rows = parseBeacRows(await res.text());
const docs = rows.map(readBeacDoc);
console.log(`${docs.length} documents à l'index\n`);

const congo = docs.filter((d) => d.country === "Congo");
console.log(`${congo.length} documents congolais`);

// Les annonces, par opposition aux résultats : ce sont elles qui portent les modalités.
const annonces = congo.filter((d) => d.kind === "annonce");
console.log(`dont ${annonces.length} annonces d'émission\n`);
for (const d of annonces.slice(0, 25)) console.log(`${d.on ?? "—"} ${String(d.instrument ?? "—").padEnd(4)} ${String(d.tenor ?? "—").padEnd(12)} ${d.doc.title}\n     ${d.url}`);

// Et ce que l'index porte pour nos quatre lignes, par leur date de séance.
console.log(`\nautour des séances qui posent question :`);
for (const jour of ["2026-07-21", "2026-07-28", "2026-09-15"]) {
  const proches = congo.filter((d) => d.on && Math.abs(Date.parse(d.on) - Date.parse(jour)) < 15 * 86_400_000);
  console.log(`\n  ${jour} : ${proches.length} documents à quinze jours`);
  for (const d of proches) console.log(`     ${d.on} ${String(d.instrument ?? "—").padEnd(4)} ${String(d.tenor ?? "—").padEnd(12)} ${d.doc.title}`);
}
