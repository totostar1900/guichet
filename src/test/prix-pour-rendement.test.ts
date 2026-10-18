import { describe, expect, it } from "vitest";
import { bondCalc, btaCalc, prixPourRendement, tauxPrecompteForRendement } from "@/lib/finance";

/**
 * L'INVERSE DOIT RENDRE EXACTEMENT CE QUE L'ALLER A PRIS.
 *
 * Le desk saisira un rendement et verra le prix qui en découle ; la fiche,
 * elle, repartira de ce prix pour afficher un rendement au client. Si les deux
 * chemins ne se referment pas, le client lit un nombre que le desk n'a pas
 * arrêté, et personne ne s'en aperçoit : les deux écrans sont loin l'un de
 * l'autre. L'aller-retour est donc le seul test qui compte vraiment.
 */

const bond = {
  nominal: 10_000,
  couponRate: 6.25,
  settleOn: "2026-10-20",
  maturityOn: "2031-07-08",
  lastCouponOn: null,
};
const bta = { nominal: 10_000, settleOn: "2026-10-20", maturityOn: "2027-09-16" };

describe("prixPourRendement", () => {
  it("referme l'aller-retour au millième de point de base", () => {
    for (const prix of [88, 92.5, 96.5, 100, 103.25]) {
      const y = bondCalc(bond, 10_000_000, prix).irr;
      const retour = prixPourRendement(bond, y);
      expect(retour).toBeDefined();
      expect(retour!).toBeCloseTo(prix, 4);
    }
  });

  it("rend un prix plus bas quand on demande un rendement plus haut", () => {
    const bas = prixPourRendement(bond, 6.5)!;
    const haut = prixPourRendement(bond, 8.5)!;
    expect(haut).toBeLessThan(bas);
  });

  it("retrouve le pair quand le rendement vaut le coupon sur une ligne neuve", () => {
    /* Convention ICMA : à l'émission, un titre qui rend son coupon vaut cent.
       C'est la seule valeur que l'on connaisse sans calculer, donc le seul
       point d'ancrage qui ne vienne pas de la fonction testée elle-même. */
    const prix = prixPourRendement({ ...bond, settleOn: "2026-07-08" }, 6.25);
    expect(prix).toBeCloseTo(100, 1);
  });

  it("refuse plutôt que d'approcher quand la cible est hors d'atteinte", () => {
    expect(prixPourRendement(bond, 10_000)).toBeUndefined();
    expect(prixPourRendement(bond, -99)).toBeUndefined();
    expect(prixPourRendement(bond, Number.NaN)).toBeUndefined();
  });
});

describe("tauxPrecompteForRendement", () => {
  it("referme l'aller-retour pour un bon", () => {
    for (const taux of [3, 5.5, 6.97, 10]) {
      const y = btaCalc(bta, 10_000_000, taux).yieldPct;
      const retour = tauxPrecompteForRendement(bta, y);
      expect(retour).toBeDefined();
      expect(retour!).toBeCloseTo(taux, 4);
    }
  });

  it("le rendement actuariel dépasse toujours le taux précompté", () => {
    /* Un bon est précompté : on paie moins que cent et on reçoit cent, donc le
       rendement effectif est supérieur au taux affiché. Si l'inverse sortait,
       c'est le sens de la bissection qui serait retourné. */
    const taux = tauxPrecompteForRendement(bta, 7.6)!;
    expect(taux).toBeLessThan(7.6);
  });

  it("refuse une cible hors d'atteinte", () => {
    expect(tauxPrecompteForRendement(bta, 5_000)).toBeUndefined();
    expect(tauxPrecompteForRendement(bta, Number.NaN)).toBeUndefined();
  });
});
