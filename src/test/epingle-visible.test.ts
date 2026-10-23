import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * LA LIGNE QU'ON VIENT DE DÉSIGNER DOIT SE VOIR, ET SON REMPLACEMENT DOIT SE
 * SENTIR.
 *
 * Pointer un point du tracé fait monter sa ligne juste sous le nuage, au lieu
 * de quitter la page : les deux sont alors sous les yeux en même temps, ce
 * qui est tout l'objet du geste. Deux défauts le ruinaient, et tous deux
 * tiennent à la même cause — le geste répondait, l'écran restait muet.
 *
 *   LA CARTE PARAISSAIT HORS DE L'ÉCRAN. Elle se pose au-dessus de la liste,
 *   donc souvent au-dessus du point qu'on vient de toucher : qui avait
 *   descendu la page pour atteindre le tracé ne voyait rien arriver, et
 *   repointait le même point en croyant avoir manqué sa cible.
 *
 *   UN SECOND POINT NE SE VOYAIT PAS NON PLUS. Une seule épingle à la fois :
 *   la carte était remplacée SUR PLACE, au même endroit et de la même taille.
 *
 * POURQUOI UN CLIQUET DE SOURCE ET NON UN ESSAI DE RENDU. La suite de la
 * maison tourne en Node, sans DOM : aucun jsdom, aucune bibliothèque de
 * rendu, et en ajouter une pour ce seul cas serait une dépendance de plus
 * dans le dépôt pour trois assertions. Ce cliquet tient donc les décisions
 * qui se relisent — le défilement minimal, la sortante gardée le temps du
 * mouvement, le respect du mouvement réduit — et il tombe si l'une disparaît.
 *
 * CE QU'IL NE PEUT PAS TENIR : que le mouvement soit joli. Cela se regarde,
 * et le jeu d'essai local ne le permet pas — le tracé demande deux lignes
 * portant une échéance, et la cote de démonstration n'en a qu'une.
 */
const AIRE = "src/components/market/AireEpinglee.tsx";
const lire = (f: string) => readFileSync(f, "utf8");

describe("la ligne épinglée se voit", () => {
  const src = lire(AIRE);

  it("amène la carte sous les yeux, au plus court", () => {
    expect(src).toMatch(/scrollIntoView/);
    /* « nearest » ne déplace la page que de ce qu'il faut : le tracé reste
       donc visible. « center » ou « start » le pousseraient hors de l'écran,
       et l'on perdrait précisément ce qu'on voulait garder. */
    expect(src).toMatch(/block:\s*"nearest"/);
    expect(src).not.toMatch(/block:\s*"(center|start)"/);
  });

  it("ne défile pas au montage", () => {
    /* Arriver sur la page par un lien qui porte déjà une épingle ne doit pas
       arracher le lecteur du haut de la page : il n'a rien demandé. */
    expect(src).toMatch(/premier/);
    expect(src).toMatch(/premier\.current\s*=\s*false/);
  });

  it("garde la sortante le temps du mouvement, puis la retire", () => {
    expect(src).toMatch(/setSortant\(avant\.node\)/);
    expect(src).toMatch(/setTimeout\(\(\)\s*=>\s*setSortant\(null\),\s*DUREE\)/);
    /* La sortante porte le NŒUD d'avant et non la clef : elle doit continuer
       d'afficher la ligne qu'elle montrait, pas celle qui arrive. */
    expect(src).toMatch(/node:\s*ReactNode/);
  });

  it("ne joue une sortie que sur un remplacement", () => {
    // La première épingle n'a rien à chasser : une sortie y ferait clignoter
    // une carte vide.
    expect(src).toMatch(/if \(avant\.cle && cle && doux\)/);
  });

  it("se tait sous « mouvement réduit », des deux côtés", () => {
    const n = [...src.matchAll(/prefers-reduced-motion/g)].length;
    expect(n, "le défilement ET le glissement doivent le respecter").toBeGreaterThanOrEqual(2);
  });

  it("est la même pièce pour la cote et pour les fonds", () => {
    /* Les deux pages posent la carte au même endroit, et le geste doit
       répondre pareil des deux côtés : deux copies divergeraient. */
    for (const f of ["src/components/OfferBrowser.tsx", "src/app/fonds/FundsBrowser.tsx"]) expect(lire(f), f).toMatch(/<AireEpinglee /);
  });

  it("porte son mouvement dans la feuille partagée", () => {
    /* La pièce est partagée par deux pages qui ont chacune leur feuille : les
       règles vivent donc dans globals, et non dans un module qui n'en
       servirait qu'une. */
    const g = lire("src/app/globals.css");
    expect(g).toMatch(/\[data-epingle-sort\]/);
    expect(g).toMatch(/\[data-epingle-entre\]/);
    expect(g).toMatch(/@keyframes epingle-sort/);
    expect(g).toMatch(/@keyframes epingle-entre/);
    /* La sortante est posée PAR-DESSUS : sans cela les deux cartes
       s'empileraient et la page sauterait de leur hauteur. */
    expect(g).toMatch(/\[data-epingle-sort\]\s*\{[^}]*position:\s*absolute/);
  });
});
