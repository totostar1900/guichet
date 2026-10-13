import { describe, expect, it } from "vitest";
import { expliquerLeMouvement, parCause, type LigneDEncours } from "@/lib/market/mouvements";

/**
 * UN STOCK QUI CHANGE SANS RAISON NOMMÉE N'EST PAS UNE DONNÉE.
 *
 * Toute la valeur de la table d'encours est dans son évolution, et une
 * évolution ne se défend que si chaque variation s'explique. Ces tests
 * gardent deux choses : que la somme boucle au franc, et qu'une ligne
 * disparue avant son échéance soit appelée un TROU et non un remboursement.
 */
const l = (isin: string, units: number, nominal: number, coursPct = 100, echeance?: string): LigneDEncours => ({
  isin,
  units,
  nominal,
  coursPct,
  encours: units * nominal * (coursPct / 100),
  echeance,
});

describe("le mouvement d'un encours", () => {
  it("BOUCLE AU FRANC SUR LES CINQ CAUSES À LA FOIS", () => {
    /* Le cas complet : une ligne s'amortit, une autre est abondée, une
       troisième se revalorise, une quatrième entre et une cinquième arrive à
       échéance. Si la somme ne boucle pas ici, elle ne bouclera nulle part. */
    const avant = [
      l("AMORTIT", 1000, 10000),
      l("ABONDE", 1000, 10000),
      l("BOUGE", 1000, 10000, 99),
      l("ECHUE", 1000, 10000, 100, "2026-06-30"),
    ];
    const apres = [
      l("AMORTIT", 1000, 8000),
      l("ABONDE", 1500, 10000),
      l("BOUGE", 1000, 10000, 101),
      l("ENTRE", 2000, 10000),
    ];
    const r = expliquerLeMouvement(avant, apres, "2026-07-01");
    expect(r.residu).toBeCloseTo(0, 6);
    expect(r.explique).toBeCloseTo(r.variation, 6);
    const c = parCause(r);
    expect(c.amortissement).toBeCloseTo(-2_000_000, 6);
    expect(c.abondement).toBeCloseTo(5_000_000, 6);
    expect(c.revalorisation).toBeCloseTo(200_000, 6);
    expect(c.entree).toBeCloseTo(20_000_000, 6);
    expect(c.echeance).toBeCloseTo(-10_000_000, 6);
    expect(r.trous).toHaveLength(0);
  });

  it("APPELLE TROU UNE LIGNE DISPARUE AVANT SON ÉCHÉANCE, ET NON UN REMBOURSEMENT", () => {
    /* C'EST LE POINT. 1 547 relevés manquent dans la série, et chaque
       absence fait baisser le total exactement comme une extinction de
       dette. Les confondre, c'est publier une courbe qui descend quand
       c'est la lecture qui a lâché. */
    const r = expliquerLeMouvement([l("VIVANTE", 1000, 10000, 100, "2029-01-01")], [], "2026-07-01");
    expect(r.trous).toHaveLength(1);
    expect(r.trous[0].isin).toBe("VIVANTE");
    expect(r.trous[0].montant).toBe(-10_000_000);
    expect(r.trous[0].detail).toContain("sans être échue");
    expect(parCause(r).echeance).toBe(0);
  });

  it("UNE SORTIE À L'ÉCHÉANCE N'EST PAS UN TROU", () => {
    const r = expliquerLeMouvement([l("ECHUE", 1000, 10000, 100, "2026-06-30")], [], "2026-07-01");
    expect(r.trous).toHaveLength(0);
    expect(parCause(r).echeance).toBe(-10_000_000);
  });

  it("SANS ÉCHÉANCE CONNUE, LA DISPARITION EST UN TROU", () => {
    /* Le doute profite au signalement : une sortie silencieuse est la chose
       qu'on cherche, et la manquer coûte plus qu'un faux positif. */
    const r = expliquerLeMouvement([l("SANS", 1000, 10000)], [], "2026-07-01");
    expect(r.trous).toHaveLength(1);
  });

  it("NE SIGNALE RIEN QUAND RIEN NE BOUGE", () => {
    const meme = [l("A", 1000, 10000), l("B", 500, 10000, 99)];
    const r = expliquerLeMouvement(meme, meme, "2026-07-01");
    expect(r.mouvements).toHaveLength(0);
    expect(r.variation).toBe(0);
  });

  it("L'AMORTISSEMENT PORTE SA VALEUR PLEINE, AVANT LES AUTRES TERMES", () => {
    /* L'ordre de décomposition est une convention, et elle est écrite : le
       nominal bouge d'abord, à titres et à cours inchangés. Une ligne qui
       s'amortit ET se revalorise le même jour doit porter l'amortissement
       au cours d'AVANT, sinon le terme croisé le gonfle en douce. */
    const r = expliquerLeMouvement([l("X", 1000, 10000, 100)], [l("X", 1000, 8000, 110)], "2026-07-01");
    const c = parCause(r);
    expect(c.amortissement).toBeCloseTo(-2_000_000, 6);
    expect(c.revalorisation).toBeCloseTo(800_000, 6);
    expect(r.residu).toBeCloseTo(0, 6);
  });
});
