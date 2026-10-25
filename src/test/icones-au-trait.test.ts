import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
    for (const f of ["src/app/trader/Parcours.module.css", "src/components/Pli.module.css", "src/components/mobile/Rubriques.module.css"]) {
      const bloc = lire(f);
      const marque = bloc.slice(bloc.indexOf(".marque svg"), bloc.indexOf("}", bloc.indexOf(".marque svg")));
      expect(marque, `${f} réécrit la peinture des icônes`).not.toMatch(/fill:|stroke:/);
      expect(marque, `${f} ne règle plus la taille de l'icône`).toMatch(/width:/);
    }
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
