/**
 * RELIRE DES SÉANCES NOMMÉES, ET RIEN D'AUTRE.
 *
 * `relire-tout.mjs` reprend tout ce qu'un lecteur aurait à gagner, ce qui est
 * la bonne porte quand une montée touche toute la base. Mais une montée qui
 * ne change qu'un message sur sept rangées n'a aucune raison de coûter deux
 * heures et demie : on nomme les séances, et c'est tout.
 *
 * LA RELECTURE AJOUTE ET CORRIGE, ELLE NE RETIRE JAMAIS : une cotation
 * retrouvée écrase la sienne, une cotation que le lecteur ne retrouve pas
 * reste en place. Les remarques, elles, sont réécrites.
 *
 *   npx tsx --conditions=react-server scripts/relire-seances.mjs 2025-01-15 2026-07-10
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { ingestBoc } = await import("../src/lib/market/boc.ts");
const { VERSION_DU_LECTEUR } = await import("../src/lib/market/lecteur-version.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);
/* Cinq cents dates ne tiennent pas sur une ligne de commande Windows : on
   accepte un fichier, une date par ligne, et c'est la seule différence. */
const depuisFichier = process.argv.find((a) => a.startsWith("--fichier="))?.slice(10);
const seances = (depuisFichier ? fs.readFileSync(depuisFichier, "utf8").split(/\r?\n/) : process.argv.slice(2))
  .map((a) => a.trim())
  .filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

if (!seances.length) {
  dire("usage : relire-seances.mjs AAAA-MM-JJ [AAAA-MM-JJ…]  |  --fichier=liste.txt");
  process.exit(1);
}

dire(`${seances.length} séance(s) à relire avec le lecteur v${VERSION_DU_LECTEUR}\n`);
for (const s of seances) {
  try {
    const r = await ingestBoc({ sessionDate: s, by: "desk" });
    dire(`   ${s}  ${r.error ? `ÉCHEC : ${r.error}` : `ok · ${r.created?.length ?? 0} créée(s), ${r.refreshed?.length ?? 0} rafraîchie(s)`}`);
  } catch (e) {
    dire(`   ${s}  ÉCHEC : ${e.message}`);
  }
}
