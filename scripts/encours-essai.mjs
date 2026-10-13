/** Ce que le lecteur d'encours rend, sur quelques séances. */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const { rangeesDuPdf, encoursGeometriques } = await import("../src/lib/market/boc-geometrie.ts");

const tous = await repo().listBulletins(2000);
for (const jour of process.argv.slice(2)) {
  const b = tous.find((x) => x.sessionDate === jour);
  if (!b) {
    console.log(`${jour} : absente`);
    continue;
  }
  const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  const lignes = encoursGeometriques(await rangeesDuPdf(Uint8Array.from(bytes)));
  const total = lignes.reduce((a, l) => a + l.outstanding, 0);
  console.log(`\n=== ${jour} · ${lignes.length} lignes · encours total ${(total / 1e9).toFixed(0)} Mds ===`);
  for (const l of lignes.slice(0, 8)) {
    console.log(
      `  ${l.isin} ${l.mnemo.padEnd(6)} ${l.issuer.slice(0, 18).padEnd(18)} ${String(l.couponRate).padStart(5)}% ` +
        `${String(l.units).padStart(11)} × ${String(l.nominalRemaining).padStart(7)} = ${String(l.outstanding).padStart(15)} ` +
        `${l.amortisation.padEnd(9)} ${l.periodicity.padEnd(4)} coupon ${l.previousCouponOn} → ${l.nextCouponOn}`,
    );
  }
  const parPays = {};
  for (const l of lignes) parPays[l.issuer] = (parPays[l.issuer] ?? 0) + l.outstanding;
  console.log("  --- par émetteur ---");
  for (const [p, v] of Object.entries(parPays).sort((a, b) => b[1] - a[1])) console.log(`     ${p.padEnd(26)} ${(v / 1e9).toFixed(0).padStart(6)} Mds`);
}
