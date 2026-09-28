import { describe, expect, it } from "vitest";
import { depouiller, prixImplicite, type TitreObs } from "@/lib/market/zero-coupon";
import { fluxRestants, ytm } from "@/lib/market/yield";

/**
 * Un dépouillement se vérifie en partant d'une courbe qu'on connaît.
 *
 * On choisit une courbe zéro-coupon, on en valorise des obligations, on en déduit
 * leurs rendements actuariels comme le ferait une séance d'adjudication, puis
 * on dépouille et on regarde si la courbe de départ revient. C'est le seul
 * contrôle qui distingue un code qui calcule d'un code qui rend un nombre.
 */
describe("le dépouillement en zéro-coupon", () => {
  /** Une courbe montante : c'est le cas où rendement et zéro-coupon diffèrent. */
  const z = (a: number) => 4 + 4 * (1 - Math.exp(-a / 2.5));
  /** Le prix d'une obligation sur cette courbe, pied de coupon. */
  const prixVrai = (annees: number, couponPct: number) => {
    let v = 100 / (1 + z(annees) / 100) ** annees;
    for (const d of fluxRestants(annees)) v += couponPct / (1 + z(d) / 100) ** d;
    return v;
  };
  /** Ce que la séance publierait : le rendement actuariel de ce prix. */
  const observer = (annees: number, couponPct: number): TitreObs => ({
    annees,
    couponPct,
    ytmPct: ytm(prixVrai(annees, couponPct), couponPct, annees)!,
  });

  it("le prix implicite est bien celui dont le rendement est issu", () => {
    const t = observer(7, 6.5);
    expect(prixImplicite(t)).toBeCloseTo(prixVrai(7, 6.5), 6);
  });

  it("laisse un bon tel quel : il est zéro-coupon par construction", () => {
    const [s] = depouiller([{ annees: 0.25, couponPct: 0, ytmPct: 6.4 }]);
    expect(s.spotPct).toBe(6.4);
    expect(s.depouille).toBe(false);
    expect(s.ecartPb).toBe(0);
  });

  it("laisse tel quel un titre qui n'a plus qu'un flux", () => {
    /* Onze mois avant l'échéance : le dernier coupon vient avec le capital, et
       ce titre est un zéro-coupon comme un autre. */
    const t = observer(0.92, 6);
    const [s] = depouiller([t]);
    expect(s.spotPct).toBeCloseTo(t.ytmPct, 9);
    expect(s.depouille).toBe(false);
  });

  it("retrouve la courbe zéro-coupon qui a servi à valoriser les titres", () => {
    const titres = [
      observer(0.25, 0),
      observer(0.5, 0),
      observer(1, 0),
      observer(2, 5.5),
      observer(3, 6),
      observer(5, 6.25),
      observer(7, 6.5),
      observer(10, 6.75),
    ];
    for (const s of depouiller(titres)) expect(s.spotPct).toBeCloseTo(z(s.annees), 1);
  });

  it("relève le long terme : c'est le sens de l'effet du coupon", () => {
    /* Sur une courbe montante, les coupons intermédiaires s'actualisent à des
       taux plus bas que l'échéance, ce qui tire le rendement sous le spot. */
    const titres = [observer(0.5, 0), observer(1, 0), observer(3, 6), observer(7, 6.5), observer(10, 6.75)];
    const dix = depouiller(titres).find((s) => s.annees === 10)!;
    expect(dix.spotPct).toBeGreaterThan(dix.ytmPct);
    expect(dix.ecartPb).toBeGreaterThan(5);
    expect(dix.depouille).toBe(true);
  });

  it("ne déplace rien sur une courbe plate", () => {
    const plat = 7;
    const prix = (annees: number, c: number) => {
      let v = 100 / (1 + plat / 100) ** annees;
      for (const d of fluxRestants(annees)) v += c / (1 + plat / 100) ** d;
      return v;
    };
    const titres: TitreObs[] = [1, 3, 5, 10].map((a) => ({ annees: a, couponPct: 6, ytmPct: ytm(prix(a, 6), 6, a)! }));
    for (const s of depouiller(titres)) expect(s.spotPct).toBeCloseTo(plat, 2);
  });

  it("écarte ce qui n'est pas un titre", () => {
    const s = depouiller([
      { annees: 0, couponPct: 0, ytmPct: 5 },
      { annees: -1, couponPct: 0, ytmPct: 5 },
      { annees: 2, couponPct: -1, ytmPct: 5 },
      { annees: 3, couponPct: 0, ytmPct: Number.NaN },
      { annees: 1, couponPct: 0, ytmPct: 6 },
    ]);
    expect(s).toHaveLength(1);
    expect(s[0].annees).toBe(1);
  });
});
