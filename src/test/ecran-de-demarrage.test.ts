import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/* L'ÉCRAN DE DÉMARRAGE ANIMÉ (28 novembre 2026) : le logo vit dès la première image de l'application installée. */
const lire = (f: string) => readFileSync(f, "utf8");

describe("l'écran de démarrage animé", () => {
  const css = lire("src/components/EcranDeDemarrage.module.css");
  it("n'existe que dans l'application installée : dans un navigateur il ne couvre rien", () => {
    expect(css).toMatch(/\.demarrage\s*\{\s*display:\s*none;\s*\}/);
    expect(css).toMatch(/@media \(display-mode: standalone\)/);
  });
  it("part à l'hydratation, et de lui-même après 25 s si elle ne vient pas", () => {
    expect(css).toMatch(/:global\(html\[data-pret\]\) \.demarrage/);
    expect(css).toMatch(/animation: sortie 0\.3s ease 25s forwards/);
    expect(lire("src/components/DemarrageTermine.tsx")).toMatch(/dataset\.pret = "1"/);
  });
  it("anime le logo, le trait d'or et le halo, et s'arrête pour qui demande moins de mouvement", () => {
    for (const a of ["respire", "trait", "halo"]) expect(css, a).toMatch(new RegExp(`@keyframes ${a}`));
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
  it("est posé en premier dans le corps de la page, sans script", () => {
    const l = lire("src/app/layout.tsx");
    expect(l).toMatch(/<body>[\s\S]{0,400}<EcranDeDemarrage \/>/);
    expect(lire("src/components/EcranDeDemarrage.tsx")).not.toMatch(/<script/);
  });
});
