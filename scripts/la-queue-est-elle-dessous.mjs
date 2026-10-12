/**
 * LA QUEUE MANQUANTE EST-ELLE ABSENTE, OU IMPRIMÉE JUSTE EN DESSOUS ?
 *
 * La distinction décide du remède, et elle décide seule. Si la variation et la
 * référence du jour suivant ne sont pas dans le document, les taire est juste.
 * Si elles sont posées deux points plus bas, les taire est une perte
 * silencieuse, et le remède est d'élargir le rattachement de la queue, pas
 * d'accepter la queue courte.
 *
 * On imprime donc, autour de chaque rangée à queue courte, les deux rangées
 * d'avant et les deux d'après, avec leurs ordonnées.
 *
 *   npx tsx --conditions=react-server scripts/la-queue-est-elle-dessous.mjs <séance> <page>
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const seance = process.argv[2] ?? "2023-09-25";
const page = Number(process.argv[3]) || 3;
const CIBLES = /CG0000020261|CG0000020329|CM0000020115|CM0000020255|CG0000020220/;

const b = (await r.listBulletins(2000)).find((x) => x.sessionDate === seance);
const bytes = b?.fileKey ? await readSource(b.fileKey) : (await fetchBoc(seance))?.bytes;
if (!bytes) throw new Error(`pas de fichier pour ${seance}`);

const rangees = (await rangeesDuPdf(Uint8Array.from(bytes))).filter((x) => x.page === page);
console.log(`${seance} page ${page} · ${rangees.length} rangées\n`);

for (const [i, x] of rangees.entries()) {
  if (!x.cellules.some((c) => CIBLES.test(c.texte))) continue;
  const isin = x.cellules.find((c) => CIBLES.test(c.texte))?.texte.match(CIBLES)?.[0];
  console.log(`--- ${isin} (rangée ${i}, y = ${x.y.toFixed(1)}) ---`);
  for (let k = i - 1; k <= i + 2; k++) {
    const v = rangees[k];
    if (!v) continue;
    const ecart = k === i ? "" : ` · écart ${(x.y - v.y).toFixed(1)}`;
    console.log(`   ${k === i ? ">>" : "  "} y=${v.y.toFixed(1)}${ecart} · ${v.cellules.length} cell. · ${v.cellules.map((c) => c.texte).join(" | ").slice(0, 170)}`);
  }
  console.log();
}
