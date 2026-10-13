/** Où la nouvelle borne coupe-t-elle la section, et que reste-t-il ? */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const neuf = await import("../src/lib/market/boc-parse.ts");
const vieux = await import("../src/lib/market/boc-parse.head.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const CAPI = /^Capitalisation .* cellules incomplètes|^Section « Capitalisation/;

for (const jour of process.argv.slice(2)) {
  const b = (await repo().listBulletins(2000)).find((x) => x.sessionDate === jour);
  const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  const texte = await pdfText(Uint8Array.from(bytes));
  const A = vieux.parseBoc(texte);
  const B = neuf.parseBoc(texte);

  const lignes = texte.split(/\r?\n/).map((l) => l.trim());
  const debut = lignes.findIndex((l) => /^CAPITALISATION BOURSIERE/.test(l));
  const nu = lignes.findIndex((l, i) => i > debut && /^Total\s*$/.test(l));
  const neufBorne = lignes.findIndex((l, i) => i > debut && /^Total\s*$|^Total\s*[\d-]/.test(l));

  console.log(`\n=== ${jour} ===`);
  console.log(`  début ${debut} · borne ancienne ${nu} · borne nouvelle ${neufBorne}`);
  if (neufBorne > 0) console.log(`  ligne de borne : « ${lignes[neufBorne].slice(0, 60)} »`);
  console.log(`  capitalisations  avant ${A.capitalisation?.length ?? 0}  après ${B.capitalisation?.length ?? 0}`);
  console.log(`  remarques capi   avant ${A.warnings.filter((w) => CAPI.test(w)).length}  après ${B.warnings.filter((w) => CAPI.test(w)).length}`);
  for (const w of B.warnings.filter((w) => CAPI.test(w)).slice(0, 3)) console.log(`     ${w.slice(0, 100)}`);
  console.log("  ce que l ANCIEN lecteur rangeait en capitalisation :");
  for (const c of A.capitalisation ?? []) console.log(`     ${c.isin} ${c.mnemo} · cours ${c.close} · flottant ${c.sharesFloat} · total ${c.sharesTotal} · capF ${c.marketCapFloat} · capG ${c.marketCapTotal}`);
}
