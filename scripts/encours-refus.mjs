/** Les rangées d'encours que le contrôle refuse, et pourquoi. */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const { rangeesDuPdf, encoursGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { Carnet } = await import("../src/lib/market/boc-parse.ts");

const b = (await repo().listBulletins(2000)).find((x) => x.sessionDate === (process.argv[2] ?? "2026-10-12"));
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
const carnet = new Carnet();
const out = encoursGeometriques(await rangeesDuPdf(Uint8Array.from(bytes)), carnet);
console.log(`${out.length} acceptées, ${carnet.notes?.length ?? carnet.warnings?.length ?? 0} refusées\n`);
for (const n of carnet.notes ?? []) console.log(`REFUS ${n.message}\n   brut ${String(n.brut)}\n`);
