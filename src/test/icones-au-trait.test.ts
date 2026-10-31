import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ICONE_SERVICE } from "@/components/nav/IconesServices";
import { CATALOGUE } from "@/lib/domain/services";

/**
 * UNE ICÔNE DESSINE UN TRAIT, ET NON UN APLAT.
 *
 * Relevé à l'écran le 25 octobre 2026, sur les tuiles de Trade : le marteau
 * d'une adjudication était un losange sombre, l'action cotée un point de deux
 * pixels, la conservation une goutte pleine. Les dessins étaient justes et
 * personne ne les voyait.
 *
 * LA CAUSE EST UN DÉFAUT DE SVG, pas une erreur de dessin. Un « path » sans
 * attribut de peinture se remplit en noir et ne trace rien : « fill: black,
 * stroke: none ». Ces icônes n'en portent aucun — c'est voulu, la couleur
 * appartient à l'écran qui les pose — mais il fallait alors que quelqu'un
 * déclare le trait, et personne ne le faisait pour les icônes de service.
 * Leurs trois poseurs (la tuile du parcours, la bande du pli, la rubrique du
 * téléphone) réglaient une taille, jamais une peinture.
 *
 * LA RÈGLE VIT DONC AVEC LES ICÔNES. Trois copies d'un trait divergent ; une
 * seule se corrige. Ce cliquet tient les deux moitiés : le dessin ne porte
 * pas sa peinture, et le composant applique la classe qui la porte.
 */
const ROOT = resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(join(ROOT, f), "utf8");

describe("les icônes de service se voient", () => {
  it("portent une classe, et cette classe trace au lieu de remplir", () => {
    const tsx = lire("src/components/nav/IconesServices.tsx");
    expect(tsx, "le dessin ne porte plus la classe qui le trace : il ressortira en aplat").toMatch(/<svg viewBox="0 0 24 24" aria-hidden="true" className=\{styles\.icone\}>/);
    const css = lire("src/components/nav/IconesServices.module.css");
    expect(css, "la classe ne neutralise plus le remplissage par défaut").toMatch(/fill:\s*none/);
    expect(css, "la classe ne trace plus rien").toMatch(/stroke:\s*currentColor/);
    /* « currentColor » et non une couleur fixe : la couleur appartient à
       l'écran qui pose l'icône — doré sur une tuile, encre atténuée sur une
       bande — et une couleur écrite ici les écraserait toutes. */
    expect(css, "la feuille des icônes impose une couleur à ses trois poseurs").not.toMatch(/stroke:\s*var\(--/);
  });

  it("et le dessin lui-même ne porte aucune peinture : la classe est donc portante", () => {
    /* Non vacuité. Si les dessins portaient « fill="none" stroke="…" » en
       attribut, la classe serait décorative et le cliquet ci-dessus ne
       garderait rien. */
    const tsx = lire("src/components/nav/IconesServices.tsx");
    expect(tsx).not.toMatch(/fill="/);
    expect(tsx).not.toMatch(/stroke="/);
  });

  /* ET LES TROIS POSEURS NE DOIVENT PAS LA REFAIRE : une quatrième copie du
     trait rouvrirait la divergence que cette feuille ferme. Ils gardent la
     taille et la couleur, qui leur appartiennent. */
  it("ne laisse aucun poseur réécrire le trait de son côté", () => {
    for (const f of ["src/app/trader/page.module.css", "src/components/Pli.module.css", "src/components/mobile/Rubriques.module.css"]) {
      const bloc = lire(f);
      const marque = bloc.slice(bloc.indexOf(".marque svg"), bloc.indexOf("}", bloc.indexOf(".marque svg")));
      expect(marque, `${f} réécrit la peinture des icônes`).not.toMatch(/fill:|stroke:/);
      expect(marque, `${f} ne règle plus la taille de l'icône`).toMatch(/width:/);
    }
  });

  /**
   * CHAQUE SERVICE A SON DESSIN, ET AUCUN DESSIN N'EST ORPHELIN.
   *
   * CE QUE CETTE ÉPREUVE AURAIT ARRÊTÉ. Le 25 octobre 2026, la clef du service
   * de la cote est passée de « actions » à « cote » — la page montre aussi les
   * obligations cotées, et l'ancien nom envoyait leur acheteur ailleurs. La
   * table des icônes est restée sur « actions ». Les trois poseurs indexent par
   * `sv.cle`, donc `ICONE_SERVICE["cote"]` a rendu `undefined` : la tuile a
   * gardé son cadre doré, VIDE, et rien n'est tombé. Vu à l'écran, pas au
   * relevé — un cadre vide est un dessin qui se charge mal, et on l'attend.
   *
   * ET L'AUTRE SENS COMPTE AUTANT : « appariement » traînait dans cette table
   * depuis que le service a quitté la vitrine en septembre. Un dessin
   * qu'aucun écran n'atteint ne se corrige jamais, et il fait croire que le
   * service existe encore à qui lit le fichier.
   */
  it("donne un dessin à chaque service du catalogue, et à eux seuls", () => {
    const sansDessin = CATALOGUE.filter((c) => !ICONE_SERVICE[c.cle]).map((c) => c.cle);
    expect(sansDessin, "ces services sortiront avec un cadre vide, et rien ne le dira").toEqual([]);
    const cles = new Set(CATALOGUE.map((c) => c.cle));
    const orphelins = Object.keys(ICONE_SERVICE).filter((k) => !cles.has(k));
    expect(orphelins, "ces dessins n'ont plus de service : aucun écran ne les atteint").toEqual([]);
    /* Non vacuité : les deux listes sont bien peuplées. Sans cette ligne, un
       catalogue vide et une table vide passeraient toutes les deux. */
    expect(CATALOGUE.length).toBeGreaterThan(5);
    expect(Object.keys(ICONE_SERVICE).length).toBe(CATALOGUE.length);
  });

  /**
   * L'ÉCUSSON TIENT LE COIN, ET LES DEUX SEUILS SONT LE MÊME NOMBRE.
   *
   * Il est passé en haut à droite le 26 octobre 2026, sur demande du
   * dirigeant : calé à gauche, il ouvrait la lecture au-dessus du titre, à la
   * place même où l'œil cherche le nom.
   *
   * CE QUE LA MESURE A IMPOSÉ. Posé dans le coin, hors du flux, il croise le
   * titre dès que la tuile se rétrécit : à 520 px, deux colonnes donnent des
   * tuiles de 240, « Adjudications » fait 195 px au degré du titre et la
   * réserve de l'écusson en prend 48 — le mot passait SOUS le dessin. Il
   * revient donc dans le flux au-dessus du seuil des deux colonnes.
   *
   * ET C'EST POURQUOI LES DEUX SEUILS DOIVENT RESTER ÉGAUX. Celui des
   * colonnes et celui de l'écusson décrivent le même basculement ; les
   * séparer, c'est rouvrir la fenêtre de largeurs où le titre se cache
   * derrière son icône — une fenêtre que personne ne regarde, puisqu'elle ne
   * s'ouvre ni sur un téléphone ni sur un écran de bureau.
   */
  it("pose l'écusson dans le coin, et bascule au même seuil que les colonnes", () => {
    const css = lire("src/app/trader/page.module.css");
    expect(css, "l'écusson n'est plus dans le coin de la tuile").toMatch(/\.marque \{[\s\S]*?position: absolute/);
    expect(css, "la tuile n'est plus le repère de ce coin : l'écusson se posera sur la page").toMatch(/\.tuile \{\n\s*position: relative/);

    const seuils = [...css.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => m[1]);
    expect(seuils.length, "il n'y a plus deux bascules à accorder").toBeGreaterThanOrEqual(2);
    expect(new Set(seuils).size, `les bascules ne sont plus au même seuil : ${seuils.join(", ")} — le titre se cachera derrière l'écusson entre les deux`).toBe(1);

    /* Non vacuité : les deux blocs sont bien ceux qu'on croit. */
    const deuxColonnes = css.slice(css.indexOf("@media (min-width:"));
    expect(deuxColonnes, "la bascule des colonnes a disparu").toMatch(/grid-template-columns: repeat\(2/);
    expect(css, "l'écusson ne revient plus dans le flux à deux colonnes").toMatch(/position: static/);
  });

  /* LES ICÔNES DE PAGE, ELLES, N'ONT QU'UN POSEUR et il déclare le trait :
     c'est pourquoi elles se voyaient. La vérification est ici pour que la
     différence soit lisible — et pour que le jour où une seconde surface les
     pose, on sache ce qu'il faudra déplacer. */
  it("les icônes de page tracent aussi, par leur unique poseur", () => {
    const css = lire("src/components/nav/Tuiles.module.css");
    expect(css).toMatch(/\.ico svg \{[\s\S]*?fill: none/);
    const poseurs = readdirSync(join(ROOT, "src"), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".tsx") && lire(join("src", f)).includes("ICONE_PAGE"));
    expect(poseurs.length, "les icônes de page ont un second poseur : le trait doit descendre avec elles").toBeLessThanOrEqual(2);
  });
});
