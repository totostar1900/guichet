import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";

/**
 * CE QUI FLOTTE AU-DESSUS D'UNE PAGE DOIT RENDRE SA PLACE À LA PAGE.
 *
 * SIGNALÉ À L'ÉCRAN LE 28 OCTOBRE 2026 : « le bouton Passer un ordre cache la
 * section Cotation et règlement ». Mesuré avant correction, fiche défilée à
 * fond sur un écran de 844 px : la dernière section allait de 566 à 759, la
 * barre flottante de 724 à 788. TRENTE-CINQ PIXELS de la section étaient sous
 * le bouton, et aucun geste ne pouvait les atteindre — la page ne défile pas
 * plus loin que sa fin, et sa fin était dessous.
 *
 * LA CLASSE DE DÉFAUT, car ce n'est pas un cas isolé : un élément en
 * « position: fixed » sort du flux, donc la page ne sait plus qu'il existe.
 * Tant qu'il reste du texte à défiler, personne ne s'en aperçoit ; le jour où
 * la dernière ligne arrive, elle arrive dessous. Et rien n'échoue.
 *
 * LE REMÈDE EST UNE CALE DANS LE FLUX, née avec la barre et de la même
 * hauteur qu'elle : la réserve existe exactement quand il y a quelque chose à
 * réserver — une ligne close n'a pas de barre et ne gagne donc pas un trou
 * blanc — et les deux lisent la même hauteur, écrite une fois.
 *
 * Mesuré après : la dernière section s'arrête à 663, la barre commence à 724.
 */
describe("la barre flottante de la fiche", () => {
  const vue = () => readFileSync(`${RACINE}/src/components/mobile/FichePanes.tsx`, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const css = () => readFileSync(`${RACINE}/src/components/mobile/FichePanes.module.css`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("naît avec une cale, qui rend à la page les pixels qu'elle prend", () => {
    const fn = /export function StickyAction[\s\S]*?\n\}/.exec(vue())?.[0] ?? "";
    expect(fn.length, "la barre est introuvable : le relevé ne mesure rien").toBeGreaterThan(100);
    expect(fn, "la barre flotte sans rien réserver : la fin de la page repassera dessous").toMatch(/className=\{styles\.cale\}/);
  });

  it("et la cale fait exactement la hauteur de la barre, écrite une fois", () => {
    /* Deux nombres séparés dériveraient : celui de la barre bougerait le jour
       où l'on change son rembourrage, celui de la cale resterait, et le
       recouvrement reviendrait de quelques pixels — trop peu pour se voir,
       assez pour couper une ligne. */
    expect(css(), "la hauteur de la barre n'est plus déclarée pour les deux").toMatch(/\.cta,\s*\n\s*\.cale \{\s*\n\s*--cta-h:/);
    expect(css(), "la cale ne lit plus la hauteur commune").toMatch(/\.cale \{[^}]*height: calc\(var\(--cta-h\)/);
  });

  it("ne réserve rien là où la barre ne paraît pas", () => {
    /* Au-dessus de 760 px, la barre n'existe pas : une cale qui y resterait
       poserait un trou blanc au bas de chaque fiche d'écran large. Les deux
       sont éteintes ensemble, et rallumées ensemble. */
    expect(css(), "la cale vit hors du téléphone, où la barre n'existe pas").toMatch(/\.seg,\s*\n\s*\.cta,\s*\n\s*\.cale \{\s*\n\s*display: none;/);
    const tel = css().slice(css().indexOf("@media (max-width: 760px)"));
    expect(tel, "la cale ne se rallume pas avec la barre").toMatch(/\.cale \{\s*\n\s*display: block;/);
  });
});

/**
 * AUCUN BOUTON DU PASSAGE D'ORDRE NE DÉPLACE L'ÉCRAN.
 *
 * SIGNALÉ LE 28 OCTOBRE 2026 : « s'assurer qu'aucun bouton de la procédure
 * d'ordre ne déplace l'écran ; certains le font ». Mesuré sur la fiche à
 * 1280 px : un clic sur « Continuer », montant vide, jetait la page de 650 à
 * 158 — QUATRE CENT QUATRE-VINGT-DOUZE PIXELS vers le haut, sous le pouce de
 * quelqu'un qui venait de viser un bouton.
 *
 * DEUX CAUSES, ET AUCUNE N'ÉTAIT UN CAPRICE. Le changement d'étape rappelait
 * la colonne du formulaire à l'écran — alors qu'elle est COLLANTE au-dessus
 * de 1000 px, donc déjà là. Et le refus mettait le focus sur le champ fautif,
 * ce qui fait sauter le navigateur pour le montrer ; « reportValidity »
 * faisait de même en attachant sa bulle au champ.
 *
 * LA RÈGLE QUI EN SORT : un refus doit se faire COMPRENDRE, pas se faire
 * chercher. La phrase se pose à côté du bouton qu'on vient de toucher, là où
 * le regard est déjà, et le focus part sans emporter la page.
 *
 * Mesuré après : refus 646 → 650 — la page grandit de la hauteur de la
 * phrase, elle ne se déplace pas ; étape 1 → 2 et 2 → 1, 650 → 650.
 */
describe("le parcours d'ordre ne bouge pas sous le doigt", () => {
  const src = () => readFileSync(`${RACINE}/src/components/IntentForm.tsx`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

  it("ne rappelle plus la page à l'ordre quand on change d'étape", () => {
    expect(src(), "le formulaire déplace de nouveau l'écran").not.toMatch(/scrollIntoView|window\.scrollTo|scrollBy/);
  });

  it("refuse en parlant, et non en sautant", () => {
    const s = src();
    expect(s, "le refus ne dit plus rien").toMatch(/setRefus\(/);
    expect(s, "la phrase du refus n'est plus montrée").toMatch(/role="alert"/);
    /* Le focus reste — il faut bien que le champ fautif reçoive la frappe
       suivante — mais il part sans emporter la page. */
    const focus = [...s.matchAll(/\.focus\(([^)]*)\)/g)].map((m) => m[1]);
    expect(focus.length, "plus aucun focus : le relevé ne mesure rien").toBeGreaterThan(0);
    expect(
      focus.filter((a) => !a.includes("preventScroll")),
      "un focus sans « preventScroll » fait sauter le navigateur pour montrer le champ",
    ).toEqual([]);
    expect(s, "« reportValidity » attache sa bulle au champ, donc y saute").not.toMatch(/reportValidity/);
  });
});
