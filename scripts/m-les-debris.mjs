/**
 * CE QUE LE LECTEUR JETTE QUAND IL DIT « LIGNE IGNORÉE (FORMAT INATTENDU) ».
 *
 * Question de Georges : comment corriger le M ? Avant de proposer un remède, il
 * faut voir ce que les débris contiennent. Ils portent le nom ET les chiffres
 * de la rangée perdue, puisque c'est elle qui n'a pas été reconnue.
 *
 * Ce script rouvre les séances concernées et imprime les débris en entier,
 * pour qu'on voie quelle FORME défait la reconnaissance de la queue.
 *
 *   npx tsx --conditions=react-server scripts/m-les-debris.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const M = /^OPCVM : ligne ignorée \(format inattendu\)/;
const JETE = /jeté « (.*?) » avant/;

const lot = (await r.listBulletins(2000)).filter((b) => (b.warnings ?? []).some((w) => M.test(w))).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
console.log(`${lot.length} séances portent la remarque M\n`);

const formes = new Map();
/* UN EXEMPLAIRE PAR FORME, et non quatorze de la même : les répétitions de
   séance en séance masquaient les formes rares. */
const exemplaires = new Map();
let total = 0;
const echantillon = [];

for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;
  const parsed = parseBoc(await pdfText(Uint8Array.from(bytes)));
  for (const w of parsed.warnings.filter((x) => M.test(x))) {
    total++;
    const jete = w.match(JETE)?.[1] ?? "";

    /* La forme : ce qui reste du débris une fois les chiffres remplacés par
       « 9 » et les lettres par « A ». Deux rangées perdues pour la même
       raison ont la même forme. */
    const forme = jete
      .replace(/\d/g, "9")
      .replace(/[A-Za-zÀ-ÿ]+/g, "A")
      .replace(/\s+/g, " ")
      .trim();
    formes.set(forme, (formes.get(forme) ?? 0) + 1);
    if (!exemplaires.has(forme)) exemplaires.set(forme, `${b.sessionDate} · ${jete}`);
  }
}

console.log(`${total} remarques M relues\n`);
console.log(`Les formes du débris, par fréquence :`);
for (const [f, n] of [...formes].sort((a, b2) => b2[1] - a[1]).slice(0, 14)) console.log(`   ${String(n).padStart(3)} × ${f.slice(0, 110)}`);
console.log(`\nUn débris entier par forme :`);
for (const [f, n] of [...formes].sort((a, b2) => b2[1] - a[1])) console.log(`\n   [${n} fois] ${exemplaires.get(f)}`);
