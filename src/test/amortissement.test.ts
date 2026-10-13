import { describe, expect, it } from "vitest";
import { echeancierDe, lireAmortissement, type Palier } from "@/lib/market/amortissement";

/**
 * LE PAS D'AMORTISSEMENT, LU DANS L'HISTOIRE AU LIEU D'ÊTRE SUPPOSÉ.
 *
 * Les séries ci-dessous sont celles de la base au 14 octobre 2026, relevées
 * sur trois ans et demi de séances. Elles gardent deux choses : que le pas
 * se lit, et que le DIFFÉRÉ que le bulletin ne publie pas s'en déduit.
 */
const p = (nominal: number, depuis: string): Palier => ({ nominal, depuis });

describe("le pas d'amortissement", () => {
  it("LE LIT, ET RÉVÈLE UN DIFFÉRÉ QUE LE BULLETIN NE PUBLIE PAS", () => {
    /* BDEAC 5,45 % 2020-2027 : SEPT ans annoncés, et pourtant CINQ tranches
       de 2 000. Deux ans de différé que personne n'imprime, et que seule la
       série rend. C'est le cas qui a démoli l'hypothèse de la maquette. */
    const a = lireAmortissement(
      [p(10000, "2023-03-22"), p(8000, "2024-01-02"), p(6000, "2024-12-31"), p(4000, "2025-12-31")],
      10000,
    );
    expect(a.source).toBe("mesure");
    expect(a.pas).toBe(2000);
    expect(a.tranches).toBe(5);
    expect(a.restantes).toBe(2);
    expect(a.aberrants).toHaveLength(0);
  });

  it("LIT AUSSI UN PAS SEMESTRIEL EN HUIT TRANCHES", () => {
    /* ALIOS 6,5 % 2023-2028 : 1 250 tous les six mois, huit tranches. */
    const a = lireAmortissement(
      [p(10000, "2024-02-05"), p(8750, "2025-02-17"), p(7500, "2025-08-18"), p(6250, "2026-02-16"), p(5000, "2026-08-17")],
      10000,
    );
    expect(a.pas).toBe(1250);
    expect(a.tranches).toBe(8);
    expect(a.restantes).toBe(4);
  });

  it("SURVIT À UN PALIER FAUX, PARCE QU'IL COMPTE LES PAS ET NON LEUR MOYENNE", () => {
    /* ACEP1 : deux séances mal lues insèrent un palier à 2 500 entre 8 000 et
       6 000. La MOYENNE des écarts passe de 2 000 à 3 750 et le pas devient
       faux ; le plus FRÉQUENT ne bouge pas. Et le palier intrus se nomme. */
    const a = lireAmortissement(
      [p(10000, "2025-04-08"), p(8000, "2025-12-30"), p(2500, "2026-04-13"), p(6000, "2026-06-30")],
      10000,
    );
    expect(a.pas).toBe(2000);
    expect(a.tranches).toBe(5);
    expect(a.aberrants.map((x) => x.nominal)).toEqual([2500]);
  });

  it("REFUSE UN PAS QUI NE DIVISE PAS LE NOMINAL EN TRANCHES ENTIÈRES", () => {
    /* L'INVARIANT QUI GARDE TOUT. Sans lui, n'importe quel écart entre deux
       mauvaises lectures passerait pour un calendrier d'amortissement. Mieux
       vaut « je ne sais pas » qu'un échéancier inventé. */
    const a = lireAmortissement([p(10000, "2024-01-01"), p(7000, "2025-01-01")], 10000);
    expect(a.pas).toBeUndefined();
    expect(a.source).toBe("suppose");
  });

  it("DIT « SUPPOSÉ » QUAND AUCUN PALIER N'A ENCORE BOUGÉ", () => {
    /* Seize lignes sur trente et une sont dans ce cas : trop jeunes, ou
       encore en différé. Elles ne sont pas une erreur, elles sont muettes. */
    const a = lireAmortissement([p(10000, "2026-02-23")], 10000);
    expect(a.source).toBe("suppose");
    expect(a.pas).toBeUndefined();
  });
});

describe("l'échéancier qui en découle", () => {
  const bdeac = {
    isin: "CG0000020220",
    tauxPct: 5.45,
    encours: 42_716_768_000,
    amortissement: "CONSTANT",
    periodicite: "AN",
    prochainCoupon: "2026-12-31",
    echeance: "2028-02-03",
    tranchesRestantes: 2,
  };

  it("REND LE CAPITAL SUR LES DERNIÈRES ÉCHÉANCES, ET LES COUPONS SUR TOUTES", () => {
    const e = echeancierDe(bdeac);
    expect(e).toHaveLength(2);
    expect(e.every((t) => t.coupon > 0)).toBe(true);
    expect(Math.round(e.reduce((a, t) => a + t.capital, 0))).toBe(bdeac.encours);
    expect(e.every((t) => t.source === "mesure")).toBe(true);
  });

  it("PLACE LE DIFFÉRÉ EN TÊTE, PAS EN QUEUE", () => {
    /* Une ligne à cinq échéances restantes mais DEUX tranches ne rembourse
       rien pendant trois ans, puis la moitié deux fois. Étaler sur cinq
       inventerait un remboursement anticipé, et c'est l'erreur exacte que la
       maquette faisait. */
    const e = echeancierDe({ ...bdeac, echeance: "2031-02-03", tranchesRestantes: 2 });
    expect(e).toHaveLength(5);
    expect(e.slice(0, 3).every((t) => t.capital === 0)).toBe(true);
    expect(e.slice(3).every((t) => t.capital > 0)).toBe(true);
  });

  it("LE COUPON SUIT LE SOLDE, IL NE RESTE PAS SUR L'ENCOURS D'AUJOURD'HUI", () => {
    /* Le poser sur l'encours actuel surestimerait les dernières années des
       trois quarts de la cote. */
    const e = echeancierDe(bdeac);
    expect(e[1].coupon).toBeLessThan(e[0].coupon);
    expect(e[0].coupon).toBeCloseTo(bdeac.encours * 0.0545, 0);
  });

  it("UNE LIGNE IN FINE NE REMBOURSE QU'À L'ÉCHÉANCE, ET SON COUPON NE BAISSE PAS", () => {
    const e = echeancierDe({ ...bdeac, amortissement: "IN FINE", echeance: "2029-12-31", tranchesRestantes: undefined });
    expect(e.filter((t) => t.capital > 0)).toHaveLength(1);
    expect(e[e.length - 1].capital).toBe(bdeac.encours);
    expect(e[0].coupon).toBeCloseTo(e[e.length - 1].coupon, 6);
  });

  it("MARQUE « SUPPOSÉ » CE QUI N'EST PAS MESURÉ", () => {
    /* La colonne de provenance est ce qui empêche de prendre une supposition
       pour une lecture une fois le chiffre arrivé dans un tableau. */
    const e = echeancierDe({ ...bdeac, tranchesRestantes: undefined });
    expect(e.every((t) => t.source === "suppose")).toBe(true);
  });
});
