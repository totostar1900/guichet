/**
 * Les fonctions passées d'un composant serveur à un composant client.
 *
 * Elles ne traversent pas : Next refuse la requête entière, et la page ne rend
 * plus du tout. Le type ne le dit pas, le compilateur ne le voit pas, et
 * « next build » ne le voit pas non plus sur une page « force-dynamic », qui
 * n'est jamais rendue à la construction. Cela ne se découvre donc qu'en
 * production, sur un « A server error occurred » qui ne nomme rien.
 *
 * C'est arrivé en rendant les tracés interrogeables : le « use client » ajouté
 * pour le survol a transformé un prédicat parfaitement légal en erreur fatale,
 * sans qu'une seule ligne de la page change.
 *
 * Le contrôle est textuel et grossier : dans les propriétés d'un composant
 * client, il cherche une valeur qui EST une flèche, posée en propriété JSX ou en
 * propriété d'un objet. Il laisse tranquille « points: xs.map((p) => …) », où la
 * flèche est l'argument d'un appel et produit une donnée.
 *
 *   node scripts/frontiere-client.mjs
 */
import fs from "node:fs";
import path from "node:path";

const racine = "src";
const fichiers = [];
(function marche(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) marche(p);
    else if (/\.tsx$/.test(e.name)) fichiers.push(p);
  }
})(racine);

/** Les composants marqués « use client », par nom exporté. */
const clients = new Map();
for (const f of fichiers) {
  const s = fs.readFileSync(f, "utf8");
  if (!/^\s*["']use client["']/m.test(s)) continue;
  for (const m of s.matchAll(/export function (\w+)/g)) clients.set(m[1], f);
  for (const m of s.matchAll(/export const (\w+)\s*[:=]/g)) clients.set(m[1], f);
}

const fautes = [];
for (const f of fichiers) {
  const s = fs.readFileSync(f, "utf8");
  // Une page ou un composant serveur : pas de « use client » en tête.
  if (/^\s*["']use client["']/m.test(s)) continue;

  for (const [nom] of clients) {
    // Chaque ouverture de balise de ce composant client, jusqu'à sa fermeture.
    for (const m of s.matchAll(new RegExp(`<${nom}\\b`, "g"))) {
      const debut = m.index;
      let prof = 0;
      let fin = debut;
      for (let i = debut; i < s.length; i++) {
        if (s[i] === "{") prof++;
        else if (s[i] === "}") prof--;
        else if (s[i] === ">" && prof === 0) {
          fin = i;
          break;
        }
      }
      const balise = s.slice(debut, fin);
      /**
       * Une propriété qui vaut une flèche. « onClick={() => …} » sur un
       * composant client rendu par le serveur est exactement la faute ; une
       * fonction définie dans un enfant, non.
       */
      for (const p of balise.matchAll(/(\w+)\s*[:=]\s*\{?\s*(?:\([^)]*\)|\w+)\s*=>/g)) {
        const ligne = s.slice(0, debut + (p.index ?? 0)).split("\n").length;
        fautes.push({ f, ligne, composant: nom, prop: p[1] });
      }
    }
  }
}

console.log(`${clients.size} composants clients · ${fichiers.length} fichiers examinés\n`);
if (!fautes.length) {
  console.log("Aucune fonction passée d'un composant serveur à un composant client.");
  process.exit(0);
}
for (const x of fautes) console.log(`✗ ${x.f}:${x.ligne} · <${x.composant} ${x.prop}={…}> : une fonction ne traverse pas la frontière`);
process.exit(1);
