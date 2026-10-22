/**
 * UNE MAQUETTE QUI S'OUVRE SANS SERVEUR.
 *
 * Les maquettes vivent sous `public/maquette`, servies par le serveur de
 * développement. Pour qu'une d'elles s'ouvre d'un double-clic ou dans un
 * panneau, ses données doivent être DANS le fichier : une balise `src` pointe
 * vers un voisin qui ne voyage pas avec lui.
 *
 *   npx tsx scripts/maquette-autonome.mjs <page.html> <donnees.js>
 */
import fs from "node:fs";

const [page, donnees] = process.argv.slice(2);
const dossier = new URL("../public/maquette", import.meta.url);
const html = fs.readFileSync(`${dossier}/${page}`, "utf8");
const js = fs.readFileSync(`${dossier}/${donnees}`, "utf8");
const balise = `<script src="${donnees}"></script>`;
if (!html.includes(balise)) throw new Error(`la page ne charge pas ${donnees}`);
const sortie = page.replace(/\.html$/, "-autonome.html");
fs.writeFileSync(`${dossier}/${sortie}`, html.replace(balise, `<script>\n${js}</script>`), "utf8");
fs.writeSync(1, `${sortie} · ${Math.round(fs.statSync(`${dossier}/${sortie}`).size / 1024)} Ko\n`);
