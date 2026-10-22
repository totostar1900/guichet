/**
 * CHAQUE FAMILLE DE REMARQUE, ET CE QU'ELLE PÈSE EN PRODUCTION.
 *
 * Pour répondre à « comment corriger chaque lettre, et le desk a-t-il un
 * geste à faire », il faut d'abord savoir lesquelles comptent.
 *
 *   npx tsx --conditions=react-server scripts/familles-en-production.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { FAMILLES, classer } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const bulletins = await repo().listBulletins(2000);
const remarques = new Map();
const seances = new Map();

for (const b of bulletins) {
  const vues = new Set();
  for (const p of [...(b.anomalies ?? []), ...(b.warnings ?? [])]) {
    const c = classer(p);
    remarques.set(c, (remarques.get(c) ?? 0) + 1);
    vues.add(c);
  }
  for (const c of vues) seances.set(c, (seances.get(c) ?? 0) + 1);
}

console.log(`${bulletins.length} séances en base\n`);
console.log(`code  genre          remarques  séances  libellé`);
for (const f of FAMILLES) {
  const r = remarques.get(f.code) ?? 0;
  const s = seances.get(f.code) ?? 0;
  console.log(`${f.code.padEnd(5)} ${f.genre.padEnd(14)} ${String(r).padStart(9)} ${String(s).padStart(8)}  ${f.libelle}`);
}
const inconnues = [...remarques].filter(([c]) => !FAMILLES.some((f) => f.code === c));
if (inconnues.length) console.log(`\nhors famille : ${JSON.stringify(inconnues)}`);
const total = [...remarques.values()].reduce((a, b) => a + b, 0);
console.log(`\n${total} remarques au total`);
