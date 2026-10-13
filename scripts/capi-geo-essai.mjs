/**
 * La lecture géométrique rend-elle la capitalisation là où l'aplatie échoue ?
 *
 *   npx tsx --conditions=react-server scripts/capi-geo-essai.mjs 2025-06-02 …
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { rangeesDuPdf, capitalisationsGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const tous = await repo().listBulletins(2000);
for (const jour of process.argv.slice(2)) {
  const b = tous.find((x) => x.sessionDate === jour);
  if (!b) {
    console.log(`${jour} : absente`);
    continue;
  }
  const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  if (!bytes) {
    console.log(`${jour} : pas de PDF`);
    continue;
  }
  const u = Uint8Array.from(bytes);
  const aplati = parseBoc(await pdfText(Uint8Array.from(bytes)));
  const geo = capitalisationsGeometriques(await rangeesDuPdf(u));
  console.log(`\n${jour}  aplati ${aplati.capitalisation.length}  géométrie ${geo.length}`);
  for (const c of geo) {
    const okF = Math.abs(c.marketCapFloat - c.close * c.sharesFloat) <= 1;
    const okG = Math.abs(c.marketCapTotal - c.close * c.sharesTotal) <= 1;
    console.log(`   ${c.isin} ${String(c.mnemo).padEnd(6)} cours ${String(c.close).padStart(9)} × ${String(c.sharesFloat).padStart(9)} = ${String(c.marketCapFloat).padStart(14)} ${okF ? "ok" : "FAUX"} · × ${String(c.sharesTotal).padStart(10)} = ${String(c.marketCapTotal).padStart(15)} ${okG ? "ok" : "FAUX"}  div ${c.lastDividend ?? "—"} ${c.dividendYear ?? ""} ${c.dividendDate ?? ""}`);
  }
}
