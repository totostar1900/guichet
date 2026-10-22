/**
 * Sept séances de janvier 2026 perdraient un OPCVM, 40 contre 39.
 *
 * Est-ce le lecteur d'aujourd'hui, ou l'écart existait-il déjà ? Les deux
 * lecteurs sur le MÊME texte répondent sans interprétation : si l'ancien rend
 * 39 lui aussi, l'écart ne vient pas des quatre pièces du 12 octobre 2026, il
 * vient de la source ou d'une lecture plus ancienne.
 *
 *   npx tsx scripts/qui-a-perdu-l-opcvm.mjs 2026-01-12
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc: apres } = await import("../src/lib/market/boc-parse.ts");
const { parseBoc: avant } = await import("../src/lib/market/boc-parse.avant4.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
for (const seance of process.argv.slice(2)) {
  const b = await r.getBulletin(seance);
  const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(seance))?.bytes;
  if (!bytes) {
    console.log(`${seance} : document injoignable`);
    continue;
  }
  const texte = await pdfText(bytes);
  const refs = await r.nominauxDeReference(seance);
  const a = avant(texte, refs);
  const p = apres(texte, refs);
  console.log(`${seance}  en base ${b.counts.funds} · lecteur d'avant ${a.funds.length} · lecteur d'après ${p.funds.length}`);
  const noms = (x) => new Set(x.funds.map((f) => f.name));
  const na = noms(a);
  const np = noms(p);
  for (const n of na) if (!np.has(n)) console.log(`   perdu par le nouveau : ${n}`);
  for (const n of np) if (!na.has(n)) console.log(`   gagné par le nouveau : ${n}`);
  /* Et ce que le lecteur a dit de la table : une ligne écartée se dit. */
  for (const w of p.warnings.filter((w) => /OPCVM/.test(w))) console.log(`   note : ${w.slice(0, 130)}`);
}
