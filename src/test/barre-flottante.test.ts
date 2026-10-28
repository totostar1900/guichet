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
