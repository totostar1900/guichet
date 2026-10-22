/**
 * SERVIR LES MAQUETTES, LE TEMPS DE LES REGARDER.
 *
 * `public/maquette` n est pas dans la liste blanche de la porte, et ne doit
 * pas y entrer : une maquette n est pas une page publique. Mais un dessin
 * qu on ne voit pas tourner n est pas verifie, et ses graphiques sont
 * construits en JavaScript. D ou ce serveur de rien du tout, sur un autre
 * port, qu on arrete des qu on a regarde.
 *
 *   npx tsx scripts/servir-maquettes.mjs [port]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const dossier = new URL("../public/maquette", import.meta.url);
const port = Number(process.argv[2] ?? 4321);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

http
  .createServer((req, res) => {
    const nom = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/+/, "") || "index.html";
    /* On ne sort pas du dossier : un serveur jetable reste un serveur. */
    const cible = path.resolve(dossier, nom);
    if (!cible.startsWith(path.resolve(dossier))) { res.writeHead(403).end("hors du dossier"); return; }
    fs.readFile(cible, (e, buf) => {
      if (e) { res.writeHead(404).end("introuvable"); return; }
      res.writeHead(200, { "content-type": types[path.extname(cible).toLowerCase()] ?? "application/octet-stream" });
      res.end(buf);
    });
  })
  .listen(port, () => fs.writeSync(1, `maquettes sur http://localhost:${port}/\n`));
