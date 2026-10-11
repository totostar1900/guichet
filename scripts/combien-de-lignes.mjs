/**
 * Derrière une famille de remarques, combien de lignes DISTINCTES ?
 *
 * La question décide du levier. Une famille de 140 remarques portée par un
 * seul titre se ferme d'une réponse ; la même portée par quarante titres
 * demande quarante réponses. C'est exactement ce qu'il faut savoir avant de
 * promettre au desk qu'une indication fera avancer le robot.
 *
 *   npx tsx scripts/combien-de-lignes.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { enAttente, remarques } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const attente = (await repo().listBulletins(2000)).filter(enAttente);

for (const code of ["H", "M", "K", "Q", "L", "I", "J", "O"]) {
  const quoi = {};
  let total = 0;
  for (const b of attente) {
    for (const r of remarques(b)) {
      if (r.code !== code) continue;
      total += 1;
      const isin = r.texte.match(/[A-Z]{2}\d{10}/)?.[0];
      const fonds = r.texte.match(/OPCVM ([^:]+?)\s*:/)?.[1]?.trim();
      const avant = r.texte.match(/avant « ([^»]+) »/)?.[1]?.trim();
      const id = isin ?? fonds ?? avant ?? "sans identifiant";
      quoi[id] = (quoi[id] ?? 0) + 1;
    }
  }
  if (!total) continue;
  const tri = Object.entries(quoi).sort((a, b) => b[1] - a[1]);
  console.log(`\n${code} · ${total} remarques · ${tri.length} ligne(s) distincte(s)`);
  for (const [k, n] of tri.slice(0, 6)) console.log(`   ${String(n).padStart(4)} × ${k}`);
  if (tri.length > 6) console.log(`   ... et ${tri.length - 6} autre(s)`);
}
