/** Les rangées brutes d'une séance, telles que pdfjs les rend. Aucun jugement.
 *    npx tsx --conditions=react-server scripts/voir-rangees.mjs 2025-09-30 50 80 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const [seance, de = "0", a = "200"] = process.argv.slice(2);
const b = (await repo().listBulletins(3000)).find((x) => x.sessionDate === seance);
const rangees = await rangeesDuPdf(await readSource(b.fileKey));
const dire = (s) => fs.writeSync(1, `${s}\n`);
dire(`${seance} : ${rangees.length} rangée(s)\n`);
rangees.slice(Number(de), Number(a)).forEach((r, i) => dire(`${String(Number(de) + i).padStart(3)} p${r.page} y${String(Math.round(r.y)).padStart(4)}  ${r.cellules.map((c) => c.texte).join(" | ").slice(0, 170)}`));
