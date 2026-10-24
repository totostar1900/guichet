import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * CHAQUE ATTENTE TIENT EN DEUX LIGNES, ET C'EST LA PHRASE QUI DÉCIDE.
 *
 * La bande « Ce qui vous attend » pose une entrée sur deux lignes au
 * téléphone : la phrase prend la première, la date et le bouton se partagent
 * la seconde (voir CeQuiVousAttend.module.css). La seconde ligne est tenue
 * par la mise en page ; la première ne tient que si la phrase est courte, et
 * rien dans le CSS ne peut l'imposer.
 *
 * Mesuré le 24 octobre 2026 : à 390 px, la bande laisse 326 px au texte, soit
 * environ 50 signes à 0,85 rem. Au-delà, la phrase passe à deux lignes et
 * l'entrée à trois — ce que la bande venait justement de perdre.
 *
 * LE PLAFOND EST CELUI DU JOUR, ET IL PEUT BAISSER. 47 signes pour la plus
 * longue, trois de marge. Il ne monte pas : une phrase qui ne tient plus se
 * raccourcit, elle ne pousse pas le mur.
 *
 * CE QUE LA GARDE NE VOIT PAS. « {d} » et « {p} » sont remplacés à
 * l'affichage par une destination ou un pays, plus longs que leurs trois
 * signes. Les deux phrases concernées sont donc écrites plus courtes que le
 * plafond, et la garde ne mesure que leur squelette.
 */
const PLAFOND = 50;

/** La source sans ses commentaires : une phrase citée dans une note n'est pas une phrase affichée. */
const code = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SOURCE = readFileSync("src/lib/domain/services.ts", "utf8");

/** Le corps de « attentesDuClient », et lui seul : les autres phrases du fichier vivent ailleurs. */
function corpsDesAttentes(): string {
  const debut = SOURCE.indexOf("export function attentesDuClient");
  expect(debut, "« attentesDuClient » a été renommée ou déplacée").toBeGreaterThan(-1);
  const fin = SOURCE.indexOf("\n}", debut);
  expect(fin, "la fin de « attentesDuClient » est introuvable").toBeGreaterThan(debut);
  return code(SOURCE.slice(debut, fin));
}

/** Les phrases de la colonne « quoi », dans l'ordre où elles sont écrites. */
function phrases(): string[] {
  const corps = corpsDesAttentes();
  const out: string[] = [];
  for (const m of corps.matchAll(/quoi:[\s\S]*?key:\s*"((?:[^"\\]|\\.)*)"/g)) out.push(m[1]);
  /* Le ternaire de « disponible » porte deux clefs pour une seule entrée : la
     première est prise par la boucle ci-dessus, la seconde se lit ici. */
  for (const m of corps.matchAll(/^\s*:\s*\{\s*key:\s*"((?:[^"\\]|\\.)*)"\s*\},?\s*$/gm)) out.push(m[1]);
  return out;
}

describe("Ce qui vous attend : une entrée, deux lignes", () => {
  it("lit bien toutes les phrases du domaine", () => {
    /* Une garde qui ne trouve rien passe toujours. Neuf attentes sont écrites
       aujourd'hui ; si la lecture en rend moins, c'est la lecture qui est
       cassée, pas le code qu'elle surveille. */
    expect(phrases().length).toBeGreaterThanOrEqual(9);
  });

  it("garde chaque phrase sous le plafond", () => {
    const trop = phrases()
      .map((p) => ({ p, n: p.length }))
      .filter(({ n }) => n > PLAFOND);
    expect(trop, `au-delà de ${PLAFOND} signes la phrase passe à deux lignes, et l'entrée à trois`).toEqual([]);
  });

  it("n'a pas de plafond plus haut que nécessaire", () => {
    /* Le cliquet : la plus longue d'aujourd'hui, plus trois. Si toutes
       raccourcissent, le plafond descend avec elles. */
    const plusLongue = Math.max(...phrases().map((p) => p.length));
    expect(PLAFOND - plusLongue, "le plafond a pris du mou : descendez-le").toBeLessThanOrEqual(4);
  });
});
