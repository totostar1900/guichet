/** Où le lecteur d'encours ouvre et ferme sa section, et ce qui tombe dehors.
 *    npx tsx --conditions=react-server scripts/encours-fenetre.mjs 2024-09-09 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { rangeesDuPdf, encoursGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const ENTETE = /Montant lev/i, FIN = /^(MARCHE DES|SYNTHESE|PHYSIONOMIE|CAPITALISATION)/i;
const AMORTI = /\b(CONSTANT|IN\s*-?\s*FINE|DIFFERE|DIFFÉRÉ)\b/i, ISIN = /\b([A-Z]{2}\d{10})\b/;

for (const seance of process.argv.slice(2)) {
  const b = (await repo().listBulletins(3000)).find((x) => x.sessionDate === seance);
  const rangees = await rangeesDuPdf(await readSource(b.fileKey));
  const dit = (r, m) => r.cellules.some((c) => m.test(c.texte.trim()));
  const debut = rangees.findIndex((r) => dit(r, ENTETE));
  const fin = rangees.findIndex((r, i) => i > debut + 2 && dit(r, FIN));
  const borne = fin > debut ? fin : debut + 60;
  const lus = new Set(encoursGeometriques(rangees).map((e) => e.isin));

  /* Toutes les rangées d encours de la pièce, repérées sans le constructeur. */
  const vraies = rangees.map((r, i) => ({ i, t: r.cellules.map((c) => c.texte).join(" ") }))
    .filter((x) => AMORTI.test(x.t) && ISIN.test(x.t));

  dire(`\n=== ${seance} ===`);
  dire(`   rangées ${rangees.length} · section ouverte en ${debut} · fermée en ${borne} ${fin > debut ? `(borne « ${rangees[fin].cellules.map((c) => c.texte).join(" ").slice(0, 50)} »)` : "(FENÊTRE DE 60, aucune borne trouvée)"}`);
  dire(`   rangées d'encours imprimées : ${vraies.length}, aux indices ${vraies[0]?.i} à ${vraies[vraies.length - 1]?.i}`);
  dire(`   le constructeur en rend ${lus.size}`);
  for (const v of vraies) {
    const isin = v.t.match(ISIN)[1];
    const dedans = v.i >= debut && v.i < borne;
    if (lus.has(isin)) continue;
    dire(`      PERDUE  ${isin}  rangée ${String(v.i).padStart(3)}  ${dedans ? "DANS la section" : "HORS section"}  ${v.t.slice(0, 80)}`);
  }
}
