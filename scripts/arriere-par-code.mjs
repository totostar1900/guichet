/**
 * L'arriéré des bulletins, classé par ce qu'on lui reproche.
 *
 * Avant de demander ce qu'une relecture rendrait, il faut savoir combien de
 * séances peuvent en principe quitter la liste. Celles retenues par les seuls
 * codes de date réclament un indice ou une table OPCVM que la bourse ne
 * publiait pas encore : aucune relecture ne les libérera jamais.
 *
 *   npx tsx scripts/arriere-par-code.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { FAMILLES, codes, enAttente, jamaisReparable, parCode, reparable } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const tous = await repo().listBulletins(2000);
const attente = tous.filter(enAttente).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

console.log(`${tous.length} séances en base · ${attente.length} en attente · du ${attente[0]?.sessionDate} au ${attente.at(-1)?.sessionDate}\n`);
console.log(`   ${String(attente.filter(reparable).length).padStart(4)} réparables : au moins un défaut que le lecteur peut corriger`);
console.log(`   ${String(attente.filter(jamaisReparable).length).padStart(4)} jamais réparables : retenues par les seuls codes de date`);
console.log(`   ${String(attente.filter((b) => codes(b).length === 0).length).padStart(4)} sans aucune remarque codée (dont celles sans cours d'action)`);
console.log(`   ${String(attente.filter((b) => !b.counts?.equities).length).padStart(4)} sans aucun cours d'action enregistré`);

const total = {};
for (const b of attente) for (const [c, n] of Object.entries(parCode(b))) total[c] = (total[c] ?? 0) + n;
console.log(`\nles remarques, par famille :\n`);
for (const [c, n] of Object.entries(total).sort((a, b) => b[1] - a[1])) {
  const f = FAMILLES.find((x) => x.code === c);
  const seances = attente.filter((b) => codes(b).includes(c)).length;
  console.log(`   ${c}  ${String(n).padStart(5)} remarques sur ${String(seances).padStart(3)} séances  ${f?.libelle ?? "famille inconnue"}`);
}

/* Par année : un arriéré concentré sur une période ancienne ne pèse pas comme
   un arriéré qui touche la série que les écrans montrent. */
const parAn = {};
for (const b of attente) parAn[b.sessionDate.slice(0, 4)] = (parAn[b.sessionDate.slice(0, 4)] ?? 0) + 1;
const totalAn = {};
for (const b of tous) totalAn[b.sessionDate.slice(0, 4)] = (totalAn[b.sessionDate.slice(0, 4)] ?? 0) + 1;
console.log(`\npar année :\n`);
for (const an of Object.keys(totalAn).sort()) console.log(`   ${an}  ${String(parAn[an] ?? 0).padStart(3)} en attente sur ${String(totalAn[an]).padStart(3)} séances`);
