import { describe, expect, it } from "vitest";
import { comptesRetenus, coursSurBenefice, peDEnsemble, type ComptesLus, type PoidsCote } from "@/lib/market/cours-sur-benefice";

/**
 * LE RATIO COURS SUR BÉNÉFICE.
 *
 * Les quatre pièges ci-dessous sont mesurés sur les vraies pièces, pas
 * imaginés : un semestriel pris pour un exercice, deux référentiels mêlés,
 * des millésimes différents additionnés, et une perte qui produirait un
 * ratio négatif.
 */
const c = (mnemo: string, exercice: number, referentiel: string, resultatNet: number, extra: Partial<ComptesLus> = {}): ComptesLus => ({
  mnemo,
  exercice,
  referentiel,
  periode: "annuel",
  resultatNet,
  ...extra,
});
const p = (mnemo: string, capTotal: number, close = 1000): PoidsCote => ({ mnemo, capTotal, close });

describe("les comptes retenus pour une valeur", () => {
  it("prend le dernier exercice annuel, dans le référentiel demandé s'il existe", () => {
    const comptes = [c("SOCAP", 2022, "OHADA", 10.67e9), c("SOCAP", 2023, "OHADA", 11.93e9), c("SOCAP", 2023, "IFRS", 12.94e9)];
    const { retenu, replie } = comptesRetenus(comptes, "SOCAP", "OHADA");
    expect(retenu?.exercice).toBe(2023);
    expect(retenu?.resultatNet).toBe(11.93e9);
    expect(replie).toBe(false);
  });

  it("SE REPLIE SUR L'AUTRE RÉFÉRENTIEL plutôt que de ne rien rendre", () => {
    /* Trois émetteurs sur sept ne déposent qu'en OHADA, un seul en plan
       bancaire CEMAC : exiger un référentiel unique viderait la table. */
    const { retenu, replie } = comptesRetenus([c("BANGE", 2024, "autre", 4.5e9)], "BANGE", "IFRS");
    expect(retenu?.referentiel).toBe("autre");
    expect(replie).toBe(true);
  });

  it("LA FRAÎCHEUR PRIME SUR LE RÉFÉRENTIEL, jamais l'inverse", () => {
    /* Préférer le cadre demandé retenait l'exercice 2021 de La Régionale
       quand son 2024 existe : un chiffre de trois ans, et silencieusement. */
    const comptes = [c("REG", 2021, "OHADA", 1.11e9), c("REG", 2024, "autre", 0.16e9)];
    const { retenu, replie } = comptesRetenus(comptes, "REG", "OHADA");
    expect(retenu?.exercice).toBe(2024);
    expect(replie).toBe(true);
  });

  it("le référentiel ne départage que deux dépôts du MÊME exercice", () => {
    /* SOCAP 2023 vaut 11,93 en OHADA et 12,94 en IFRS : là, il faut choisir. */
    const comptes = [c("SOCAP", 2023, "OHADA", 11.93e9), c("SOCAP", 2023, "IFRS", 12.94e9)];
    expect(comptesRetenus(comptes, "SOCAP", "IFRS").retenu?.resultatNet).toBe(12.94e9);
    expect(comptesRetenus(comptes, "SOCAP", "OHADA").retenu?.resultatNet).toBe(11.93e9);
  });

  it("ÉCARTE UN SEMESTRIEL, qui n'est pas un exercice", () => {
    /* La Régionale dépose un semestriel 2024 à 0,10 milliard quand son
       exercice 2023 en fait 0,81 : pris pour un an, son P/E passait de 48
       à 240. */
    const comptes = [c("REG", 2023, "OHADA", 0.81e9), c("REG", 2024, "autre", 0.1e9, { periode: "semestriel" })];
    const { retenu } = comptesRetenus(comptes, "REG", "OHADA");
    expect(retenu?.exercice).toBe(2023);
  });

  it("COMPARE À L'EXERCICE PRÉCÉDENT DU MÊME RÉFÉRENTIEL", () => {
    /* Comparer un OHADA à un IFRS ferait passer un écart de méthode pour une
       croissance : SOCAP 2023 vaut 11,93 en OHADA et 12,94 en IFRS, soit
       huit pour cent d'écart né de rien. */
    const comptes = [c("SOCAP", 2022, "IFRS", 10.96e9), c("SOCAP", 2022, "OHADA", 10.67e9), c("SOCAP", 2023, "OHADA", 11.93e9)];
    const { precedent } = comptesRetenus(comptes, "SOCAP", "OHADA");
    expect(precedent?.referentiel).toBe("OHADA");
    expect(precedent?.resultatNet).toBe(10.67e9);
  });

  it("ne rend rien pour une valeur sans comptes", () => {
    expect(comptesRetenus([], "BHC", "OHADA").retenu).toBeUndefined();
  });
});

describe("le ratio, valeur par valeur", () => {
  it("divise la capitalisation par le résultat net, et nomme l'exercice", () => {
    const l = coursSurBenefice([c("BHC", 2025, "OHADA", 59.49e9, { capitauxPropres: 265.94e9 })], [p("BHC", 1310.83e9)]);
    expect(l[0].pe).toBeCloseTo(22.03, 1);
    expect(l[0].exercice).toBe(2025);
    expect(l[0].rendementDesFondsPropres).toBeCloseTo(22.37, 1);
  });

  it("UNE PERTE NE FAIT PAS DE RATIO, et le dit", () => {
    const l = coursSurBenefice([c("X", 2020, "IFRS", -0.09e9)], [p("X", 10e9)]);
    expect(l[0].pe).toBeUndefined();
    expect(l[0].reserve).toContain("perte");
  });

  it("calcule la croissance depuis l'exercice précédent", () => {
    const l = coursSurBenefice([c("SOCAP", 2022, "OHADA", 10.67e9), c("SOCAP", 2023, "OHADA", 11.93e9)], [p("SOCAP", 228.79e9)]);
    expect(l[0].croissance).toBeCloseTo(11.81, 1);
  });

  it("signale une valeur sans comptes plutôt que de l'omettre", () => {
    const l = coursSurBenefice([], [p("Z", 5e9)]);
    expect(l[0].pe).toBeUndefined();
    expect(l[0].reserve).toContain("aucun exercice");
  });
});

describe("le ratio d'ensemble", () => {
  const lignes = coursSurBenefice(
    [c("BHC", 2025, "OHADA", 59.49e9), c("SOCAP", 2023, "OHADA", 11.93e9), c("PERTE", 2024, "OHADA", -1e9)],
    [p("BHC", 1310.83e9), p("SOCAP", 228.79e9), p("PERTE", 10e9), p("SANS", 5e9)],
  );

  it("ADDITIONNE PUIS DIVISE, comme on lit une entreprise unique", () => {
    /* Une moyenne des ratios donnerait le même poids à une société de dix
       milliards et à une de mille trois cents. */
    const e = peDEnsemble(lignes);
    expect(e.pe).toBeCloseTo((1310.83 + 228.79) / (59.49 + 11.93), 2);
    expect(e.comptees).toBe(2);
    expect(e.total).toBe(4);
  });

  it("NOMME LES MILLÉSIMES ADDITIONNÉS, qui ne sont pas les mêmes", () => {
    /* Au 15 octobre 2026, BHC a déposé 2025 et SOCAP s'arrête à 2023 : le
       ratio d'ensemble est une somme de millésimes, pas une photo. */
    expect(peDEnsemble(lignes).exercices).toEqual([2023, 2025]);
  });

  it("dit qui est écarté et pourquoi", () => {
    const e = peDEnsemble(lignes);
    expect(e.ecartees.map((x) => x.mnemo).sort()).toEqual(["PERTE", "SANS"]);
    expect(e.ecartees.find((x) => x.mnemo === "SANS")?.motif).toContain("aucun exercice");
  });
});
