/**
 * LIRE UNE PIÈCE GARDÉE, TELLE QU'ELLE EST.
 *
 * Avant de corriger ou d'écarter une ligne, on ouvre le communiqué. La ligne
 * tchadienne du 24 janvier 2024 annonce 30 000 milliards, soit deux mille
 * fois la médiane de son pays ; le facteur mille saute aux yeux, et c'est
 * précisément pourquoi il ne faut pas le deviner : une correction devinée
 * vaut une donnée inventée.
 *
 *   npx tsx --conditions=react-server scripts/lire-piece.mjs <file_key>
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { readSource } = await import("../src/lib/intake/storage.ts");
const { pdfText } = await import("../src/lib/market/boc.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);
const cle = process.argv[2];
if (!cle) {
  dire("usage : lire-piece.mjs <file_key>");
  process.exit(1);
}

const bytes = await readSource(cle);
dire(`${cle} · ${bytes.length} octets`);
const texte = await pdfText(bytes);
dire(`texte extrait : ${texte.length} caractères`);
dire("");
/* UN SCAN REND ZÉRO CARACTÈRE, et c'est une réponse en soi : la pièce est une
   image, il faudra la regarder plutôt que la lire. */
dire(texte.length ? texte.slice(0, 6000) : "(aucun texte : la pièce est un scan)");
