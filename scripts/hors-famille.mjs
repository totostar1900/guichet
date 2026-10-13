/** Les remarques qu'aucune famille ne reconnaît. Un cliquet exige zéro. */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { classer, INCONNU } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

for (const b of await repo().listBulletins(2000)) {
  for (const w of [...(b.anomalies ?? []), ...(b.warnings ?? [])]) {
    if (classer(w) === INCONNU) console.log(`${b.sessionDate}  ${w}`);
  }
}
