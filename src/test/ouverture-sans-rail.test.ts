import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const code = (p: string) =>
  fs.readFileSync(path.join(ROOT, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * LA PAGE D'OUVERTURE DE COMPTE N'A PLUS NI RAIL NI « ALLER À GUICHET » (1er novembre 2026).
 *
 * Demandé tel quel : la rangée « 1 Type de client … 6 Convention » sous l'en-tête et le
 * bouton « Aller à Guichet » du dossier approuvé partent. Les sections, elles, gardent leur
 * numéro (« 1 · Type de client »…) : c'est elles que le client remplit, la rangée ne faisait
 * que les redire. La reprise du dossier (« Dossier.tsx ») lit toujours les étapes.
 */
describe("l'ouverture de compte", () => {
  const page = () => code("src/app/ouvrir-un-compte/page.tsx");
  it("n'a plus la rangée des six étapes", () => {
    expect(page(), "la rangée des étapes est revenue").not.toMatch(/styles\.rail|etapesDuDossier/);
    expect(code("src/app/ouvrir-un-compte/page.module.css"), "la feuille garde la rangée des étapes").not.toMatch(/\.rail\b/);
  });
  it("n'a plus le bouton « Aller à Guichet »", () => {
    expect(page(), "le bouton « Aller à Guichet » est revenu").not.toMatch(/Aller à Guichet/);
  });
  it("se remplit pas à pas tant que le dossier est un brouillon : une étape par écran, une barre, « Continuer » ; les pièces viennent après l'envoi", () => {
    /* 19 novembre 2026, planche « Parcours d'inscription », 4A + option B. Ce n'est pas la rangée de six étapes qui est partie le 1er novembre : une barre fine et « Étape k sur n ». Les sections n'ont plus de numéro (sans pièces avant l'envoi, la numérotation sautait). */
    expect(page(), "le brouillon n'est plus pas à pas").toMatch(/const pasAPas = file\.status === "brouillon"/);
    expect(page()).toMatch(/role="progressbar"/);
    expect(page(), "les sections numérotées sont revenues").not.toMatch(/t\("\d b? ?· /);
    const sections = code("src/app/ouvrir-un-compte/Sections.tsx");
    expect(sections, "« Continuer » n'enregistre plus puis ne passe plus à l'étape suivante").toMatch(/suite \? t\("Continuer"\)/);
    /* Les pièces ne figurent pas dans les pas du brouillon : le desk les demande après l'envoi. */
    expect(code("src/lib/kyc/checklist.ts")).not.toMatch(/PAS_DE_SAISIE = \[[^\]]*pieces/);
    const pasAPas = page().slice(page().indexOf("{pasAPas ? ("), page().indexOf(") : (", page().indexOf("{pasAPas ? (")));
    expect(pasAPas, "les pièces sont revenues dans le brouillon").not.toMatch(/DocsSection/);
  });
});
