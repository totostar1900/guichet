/**
 * Un bulletin de la source devient un gabarit de test.
 *
 *   node scripts/boc-fixture.mjs 2024-06-03
 *
 * Le texte du PDF, tel que le lecteur le voit, est écrit dans
 * src/lib/market/__fixtures__/BOC-AAAAMMJJ.txt. C'est ce fichier que les
 * cliquets relisent, pour qu'un essai ne dépende jamais du réseau.
 */
import { writeFileSync } from "node:fs";

const jour = process.argv[2];
if (!jour || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) throw new Error("usage : node scripts/boc-fixture.mjs AAAA-MM-JJ");
const [y, m, d] = jour.split("-");
const url = `https://www.bvm-ac.org/wp-content/uploads/${y}/${m}/BOC-${y}${m}${d}.pdf`;

const res = await fetch(url, { headers: { "user-agent": "Guichet/1.0 (Purpose Capital; gabarit de test)" } });
if (!res.ok) throw new Error(`la source répond ${res.status} pour ${url}`);
const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
const out = await pdfParse(Buffer.from(await res.arrayBuffer()));

const cible = new URL(`../src/lib/market/__fixtures__/BOC-${y}${m}${d}.txt`, import.meta.url);
writeFileSync(cible, out.text, "utf8");
console.log(`${out.numpages} page(s) · ${out.text.length} caractères → ${cible.pathname.split("/").pop()}`);
