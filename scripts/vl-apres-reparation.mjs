/**
 * CE QUE LA RÉPARATION DE LA COQUILLE D'ANNÉE REND, SANS RIEN ÉCRIRE.
 *
 * On rouvre les séances qui portent une VL écartée et on repose la question au
 * juge d'aujourd'hui : combien de VL reviennent, combien restent dehors, et
 * pour quel motif nommé.
 *
 *   npx tsx --conditions=react-server scripts/vl-apres-reparation.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText, fundNav } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { jugerLaVl } = await import("../src/lib/market/vl-coquille.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const VL = /^OPCVM (.+) : VL du (\d{4}-\d{2}-\d{2}) ignorée/;
const lot = (await r.listBulletins(2000)).filter((b) => (b.warnings ?? []).some((w) => VL.test(w))).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
console.log(`${lot.length} séances portent au moins une VL écartée\n`);

let vues = 0;
let reparees = 0;
const restent = {};
const seancesLiberees = [];
const exemples = [];

for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;
  const parsed = parseBoc(await pdfText(Uint8Array.from(bytes)));
  const vises = new Set((b.warnings ?? []).map((w) => w.match(VL)?.[1]).filter(Boolean));
  let dehorsIci = 0;
  let repareesIci = 0;

  for (const f of parsed.funds) {
    const n = fundNav(f, parsed);
    if (!vises.has(n.name)) continue;
    vues++;
    const v = jugerLaVl(n, b.sessionDate);
    if (v.coquille) {
      reparees++;
      repareesIci++;
      if (exemples.length < 6) exemples.push(`${b.sessionDate} · ${n.name.slice(0, 28)} · ${v.coquille} → ${v.garde.navDate}`);
    } else if (!v.garde) {
      restent[v.motif] = (restent[v.motif] ?? 0) + 1;
      dehorsIci++;
    }
  }
  if (repareesIci > 0 && dehorsIci === 0) seancesLiberees.push(b.sessionDate);
}

console.log(`${vues} VL écartées retrouvées dans les documents\n`);
console.log(`   RÉPARÉES par l'année suivante : ${reparees}`);
console.log(`   restent dehors : ${Object.entries(restent).map(([m, n]) => `${n} ${m}`).join(" · ") || "aucune"}`);
console.log(`\n   ${seancesLiberees.length} séances n'ont plus AUCUNE VL écartée après réparation`);
if (exemples.length) {
  console.log(`\n   exemples :`);
  for (const e of exemples) console.log(`      ${e}`);
}
