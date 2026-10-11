/**
 * Les cinq actions du 22 décembre 2023, et laquelle refuse d'entrer en base.
 *
 * L'essai à blanc du 11 octobre 2026 a trouvé deux séances sur 212 qui ont des
 * lignes à gagner. Reste à savoir si elles les gagneraient VRAIMENT : une
 * lecture réussie peut encore être refusée à l'écriture, et c'est le cas connu
 * de cette séance (« upsertQuotes: numeric field overflow »). On lit, on
 * mesure la largeur des nombres, on n'écrit rien.
 *
 *   npx tsx scripts/seance-22-decembre.mjs [AAAA-MM-JJ]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const seance = process.argv[2] ?? "2023-12-22";
const { equityQuote, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const b = await repo().getBulletin(seance);
const parsed = parseBoc(await pdfText(await readSource(b.fileKey)));
console.log(`${seance} · BOC n° ${parsed.bulletinNo ?? "EN-TÊTE NON RECONNU"} · ${parsed.equities.length} actions lues\n`);

/* numeric(18,2) : dix-huit chiffres en tout, deux après la virgule, donc seize
   devant. Au-delà, la base refuse la LIGNE et l'écriture étant tout-ou-rien,
   la séance entière avec elle. */
const PLAFOND = 10 ** 16;
for (const e of parsed.equities) {
  const q = equityQuote(e, parsed);
  const champs = Object.entries(q).filter(([, v]) => typeof v === "number");
  const trop = champs.filter(([, v]) => Math.abs(v) >= PLAFOND);
  console.log(`   ${String(q.symbol ?? e.name).padEnd(14)} ${champs.map(([k, v]) => `${k}=${v}`).join(" · ")}`);
  for (const [k, v] of trop) console.log(`      REFUSÉ : ${k} = ${v} (${String(Math.trunc(v)).length} chiffres devant la virgule, la colonne en accepte 16)`);
}
