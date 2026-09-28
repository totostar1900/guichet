import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Une fonction ne traverse pas la frontière serveur / client.
 *
 * Passée d'un composant serveur à un composant client, Next refuse la requête
 * entière : la page ne rend plus du tout, et le client ne voit qu'un
 * « A server error occurred » qui ne nomme rien.
 *
 * Trois filets manquent à la fois sur cette faute, et c'est ce qui la rend
 * chère. Le type ne la dit pas, une propriété de type fonction étant
 * parfaitement légale. Le compilateur ne la voit pas. Et « next build » ne la
 * voit pas non plus sur une page « force-dynamic », qui n'est jamais rendue à
 * la construction : la compilation passe au vert sur une page qui ne peut pas
 * s'afficher.
 *
 * Elle nous a coûté la page d'analyses. En rendant les tracés interrogeables,
 * le « use client » ajouté pour le survol a transformé un prédicat qui vivait
 * là depuis le début en erreur fatale, sans qu'une seule ligne de la page
 * change. Le seul signe était en production.
 *
 * Le contrôle est textuel et grossier, et ne prétend pas à l'exhaustivité : il
 * attrape une valeur qui EST une flèche dans les propriétés d'un composant
 * client, qu'elle soit posée en propriété JSX ou, comme ici, en propriété d'un
 * objet passé en propriété.
 *
 * Il laisse tranquille « points: x.pts.map((p) => …) », où la flèche est
 * l'argument d'un appel et où la valeur produite est une donnée : la question
 * est de savoir si, après les deux points, vient une flèche ou un appel.
 */

const racine = path.join(process.cwd(), "src");

const tsx = (): string[] => {
  const out: string[] = [];
  (function marche(d: string) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p);
      else if (e.name.endsWith(".tsx")) out.push(p);
    }
  })(racine);
  return out;
};

const estClient = (s: string) => /^\s*["']use client["']/m.test(s);

describe("la frontière serveur / client", () => {
  const fichiers = tsx().map((f) => [f, readFileSync(f, "utf8")] as const);

  /** Les composants exportés par un fichier « use client ». */
  const clients = new Set<string>();
  for (const [, s] of fichiers) {
    if (!estClient(s)) continue;
    for (const m of s.matchAll(/export function (\w+)/g)) clients.add(m[1]);
    for (const m of s.matchAll(/export const (\w+)\s*[:=]/g)) clients.add(m[1]);
  }

  it("connaît les composants clients de la maison", () => {
    // Sans eux le test ne garde rien, et passerait au vert pour une mauvaise raison.
    expect(clients.size).toBeGreaterThan(50);
  });

  it("ne laisse aucun composant serveur passer une fonction à un composant client", () => {
    const fautes: string[] = [];
    for (const [f, s] of fichiers) {
      if (estClient(s)) continue;
      for (const nom of clients) {
        for (const m of s.matchAll(new RegExp(`<${nom}\\b`, "g"))) {
          const debut = m.index ?? 0;
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
          for (const p of s.slice(debut, fin).matchAll(/(\w+)\s*[:=]\s*\{?\s*(?:\([^)]*\)|\w+)\s*=>/g)) {
            const ligne = s.slice(0, debut).split("\n").length;
            fautes.push(`${path.relative(process.cwd(), f)}:${ligne} <${nom} ${p[1]}={…}>`);
          }
        }
      }
    }
    expect(fautes, `une fonction ne traverse pas la frontière : passez la valeur, pas la règle\n  ${fautes.join("\n  ")}`).toEqual([]);
  });
});
