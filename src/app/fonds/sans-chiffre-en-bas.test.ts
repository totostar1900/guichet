import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sansChiffreEnBas } from "./fenetre";

const f = (id: string, a1?: number, m6?: number) => ({ id, curve: { fenetres: { ...(a1 != null ? { a1: { pct: a1 } } : {}), ...(m6 != null ? { m6: { pct: m6 } } : {}) } } }) as never;

describe("les fonds sans rentabilité sur la fenêtre vont en bas de la liste", () => {
  const liste = [f("jeune"), f("a", 5), f("sans-courbe"), f("b", -2), f("c", 9)];

  it("après tous les fonds mesurés, dans l'ordre où ils étaient", () => {
    expect((sansChiffreEnBas(liste, "a1") as { id: string }[]).map((r) => r.id)).toEqual(["a", "b", "c", "jeune", "sans-courbe"]);
  });

  it("un chiffre à zéro ou négatif est un chiffre : il ne descend pas", () => {
    expect((sansChiffreEnBas([f("x"), f("zero", 0), f("neg", -3)], "a1") as { id: string }[]).map((r) => r.id)).toEqual(["zero", "neg", "x"]);
  });

  it("suit la fenêtre choisie : mesuré sur 6 mois, pas sur 12, il passe en haut quand on regarde 6 mois", () => {
    const l = [f("recent", undefined, 3), f("ancien", 8, 2)];
    expect((sansChiffreEnBas(l, "a1") as { id: string }[]).map((r) => r.id)).toEqual(["ancien", "recent"]);
    expect((sansChiffreEnBas(l, "m6") as { id: string }[]).map((r) => r.id)).toEqual(["recent", "ancien"]);
  });

  it("ne touche à rien quand tout est mesuré, et ne perd aucune ligne", () => {
    const tous = [f("a", 1), f("b", 2)];
    expect(sansChiffreEnBas(tous, "a1")).toBe(tous);
    expect(sansChiffreEnBas(liste, "a1")).toHaveLength(liste.length);
  });

  it("la liste l'applique à tous les ordres, y compris « par catégorie »", () => {
    const src = fs.readFileSync(path.join(__dirname, "FundsBrowser.tsx"), "utf8");
    expect(src).toMatch(/sansChiffreEnBas\(sort === "categorie" \? CATS\.flatMap/);
  });
});
