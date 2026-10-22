/** Le desk rend-il vraiment un lien, maintenant que les octets sont partis ? */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { repo } = await import("../src/lib/data/index.ts");
const { lienSource, readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const bulletins = (await repo().listBulletins(3000)).filter((b) => b.fileKey);
for (const b of [bulletins[0], bulletins[Math.floor(bulletins.length / 2)], bulletins[bulletins.length - 1]]) {
  const lien = await lienSource(b.fileKey);
  dire(`${b.sessionDate}  n° ${b.number ?? "?"}`);
  dire(`   lien : ${lien ?? "AUCUN  ← le desk servirait encore des octets"}`);
  /* Et la relecture : elle doit se replier sur le dossier synchronise. */
  try { const o = await readSource(b.fileKey); dire(`   octets lus : ${o.length}  ${o.length > 2048 ? "(repli sur la bibliothèque)" : "trop court"}`); }
  catch (e) { dire(`   LECTURE IMPOSSIBLE : ${e.message}`); }
}
