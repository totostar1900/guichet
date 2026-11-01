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
  it("garde ses sections numérotées, que le client remplit", () => {
    expect(page(), "les sections numérotées ont disparu : la clause ne garde plus rien").toMatch(/t\("1 · Type de client"\)/);
  });
});
