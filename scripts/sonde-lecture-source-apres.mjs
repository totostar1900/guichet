/**
 * LA MEME MESURE, MAIS PAR `readSource`, APRES LE RETOURNEMENT DE L ORDRE.
 *
 * La sonde d avant mesurait les deux etages a la main pour savoir d ou
 * venaient les octets. Celle-ci mesure LE CHEMIN REEL, celui que tous les
 * scripts empruntent, pour verifier que le retournement rend ce qu il
 * promet et ne perd rien.
 *
 *   npx tsx --conditions=react-server scripts/sonde-lecture-source-apres.mjs [n]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const combien = Number(process.argv[2] ?? 12);
const tous = (await repo().listBulletins(3000)).filter((b) => b.fileKey);
const pas = Math.max(1, Math.floor(tous.length / combien));
const choisis = tous.filter((_, i) => i % pas === 0).slice(0, combien);

const temps = [];
let perdus = 0;
for (const b of choisis) {
  const t0 = Date.now();
  try {
    const octets = await readSource(b.fileKey);
    const ms = Date.now() - t0;
    temps.push(ms);
    dire(`   ${b.sessionDate}  ${String(ms).padStart(6)} ms  ${String(Math.round(octets.length / 1024)).padStart(5)} Ko`);
  } catch (e) {
    perdus += 1;
    dire(`   ${b.sessionDate}  PERDU : ${String(e.message).slice(0, 60)}`);
  }
}

const trie = [...temps].sort((a, b) => a - b);
const med = trie.length % 2 ? trie[(trie.length - 1) / 2] : Math.round((trie[trie.length / 2 - 1] + trie[trie.length / 2]) / 2);
dire(`\n=== ${temps.length} lue(s), ${perdus} perdue(s) · mediane ${med} ms · total ${temps.reduce((a, x) => a + x, 0)} ms ===`);
