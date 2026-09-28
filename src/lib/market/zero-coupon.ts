import { fluxRestants } from "./yield";

/**
 * Le dépouillement : d'un rendement actuariel vers un taux zéro-coupon.
 *
 * Ce que nous traçons jusqu'ici est le rendement à l'échéance d'un titre à
 * coupon. Ce n'est pas une structure par terme, et la raison tient en une
 * phrase : deux titres de même échéance et de coupons différents ont des
 * rendements différents. Le rendement à l'échéance est une moyenne des taux de
 * tous les flux du titre, pondérée par ces flux ; il dépend donc du coupon,
 * c'est-à-dire d'une caractéristique du papier et non du prix du temps.
 *
 * Le taux zéro-coupon z(τ) ne dépend que de τ : c'est le taux auquel un franc
 * reçu dans τ années s'actualise. C'est lui qui s'appelle une courbe des taux,
 * lui qui sert à valoriser un portefeuille et à fixer le prix d'une émission nouvelle.
 *
 * Deux propriétés qu'on peut vérifier à l'œil et que les tests vérifient :
 *   - sur une courbe plate, rendement et zéro-coupon coïncident ;
 *   - sur une courbe montante, le rendement d'une obligation à coupon est
 *     INFÉRIEUR au zéro-coupon de son échéance, parce que ses coupons
 *     intermédiaires s'actualisent à des taux plus bas. Le dépouillement relève
 *     donc le long terme, et c'est exactement ce qu'on lui demande.
 *
 * Nos titres s'y prêtent mieux qu'ailleurs. Les BTA sont zéro-coupon par
 * construction : leur rendement EST leur taux spot, sans calcul. Et les avis
 * d'annonce confirment un remboursement in fine sur les six Trésors, donc aucun
 * amortissement à modéliser.
 *
 * Module au graphe minuscule : il n'importe que la règle des flux, qu'il
 * partage avec le calcul du rendement pour que les deux ne dérivent pas.
 */

export interface TitreObs {
  /** La vie restante, en années. */
  annees: number;
  /** Le coupon annuel, en % du nominal. Zéro pour un bon. */
  couponPct: number;
  /** Le rendement actuariel, en %. */
  ytmPct: number;
}

export interface Spot extends TitreObs {
  /** Le taux zéro-coupon, en %. */
  spotPct: number;
  /** Vrai quand il a fallu dépouiller : un bon n'a rien à dépouiller. */
  depouille: boolean;
  /** Ce que le dépouillement a déplacé, en points de base. */
  ecartPb: number;
}

/**
 * Le prix qu'implique un rendement, en % du nominal, pied de coupon.
 *
 * On n'a pas toujours le prix : beaucoup de séances n'impriment que le taux. Or
 * le prix se retrouve exactement depuis le rendement, le coupon et l'échéance,
 * puisque c'est la relation qui définit le rendement. On repart donc du prix
 * ainsi reconstruit, ce qui fait entrer les séances à taux imprimé dans le
 * dépouillement au lieu de les en exclure.
 */
export function prixImplicite(t: TitreObs): number {
  const y = t.ytmPct / 100;
  let v = 100 / (1 + y) ** t.annees;
  for (const d of fluxRestants(t.annees)) v += t.couponPct / (1 + y) ** d;
  return v;
}

/** Le taux zéro-coupon à une durée quelconque, interpolé sur les points connus. */
function interpoler(points: { annees: number; spotPct: number }[]): (a: number) => number {
  const tri = [...points].sort((x, y) => x.annees - y.annees);
  return (a: number) => {
    if (!tri.length) return 0;
    if (a <= tri[0].annees) return tri[0].spotPct;
    if (a >= tri[tri.length - 1].annees) return tri[tri.length - 1].spotPct;
    for (let i = 1; i < tri.length; i++) {
      if (a > tri[i].annees) continue;
      const g = tri[i - 1];
      const d = tri[i];
      const p = (a - g.annees) / (d.annees - g.annees || 1);
      return g.spotPct + p * (d.spotPct - g.spotPct);
    }
    return tri[tri.length - 1].spotPct;
  };
}

/**
 * Le taux zéro-coupon d'un titre, ses flux intermédiaires étant actualisés
 * sur la courbe déjà connue.
 *
 * Résolu par dichotomie sur l'unique inconnue, le taux de l'échéance. La
 * fonction est monotone décroissante en ce taux, donc la dichotomie converge
 * toujours, ce qu'un optimiseur ne garantirait pas.
 */
function spotDe(t: TitreObs, courbe: (a: number) => number): number | undefined {
  const prix = prixImplicite(t);
  const flux = fluxRestants(t.annees);
  /* Les coupons avant l'échéance, actualisés sur ce qu'on sait déjà. */
  let avant = 0;
  for (const d of flux) {
    if (Math.abs(d - t.annees) < 1e-9) continue;
    avant += t.couponPct / (1 + courbe(d) / 100) ** d;
  }
  /* Ce qui tombe à l'échéance : le capital, et le dernier coupon avec lui. */
  const terminal = 100 + (flux.some((d) => Math.abs(d - t.annees) < 1e-9) ? t.couponPct : 0);
  const reste = prix - avant;
  if (!(reste > 0)) return undefined;
  /* z tel que terminal / (1+z)^T = reste, en fermé plutôt qu'en dichotomie. */
  const z = (terminal / reste) ** (1 / t.annees) - 1;
  return Number.isFinite(z) ? z * 100 : undefined;
}

/**
 * Dépouille un jeu de titres. Les bons passent tels quels, les obligations
 * sont reprises jusqu'à ce que la courbe ne bouge plus.
 *
 * On itère parce que le dépouillement d'une obligation à sept ans a besoin de
 * la courbe à un, deux, trois ans, qui peut elle-même venir d'obligations.
 * L'ordre croissant des échéances suffirait si toutes les durées
 * intermédiaires étaient couvertes ; elles ne le sont pas, d'où
 * l'interpolation, et d'où la reprise. La convergence est rapide parce que le
 * flux terminal domine : trois passages suffisent en pratique, on en fait dix.
 */
export function depouiller(titres: TitreObs[]): Spot[] {
  const bons = titres.filter((t) => Number.isFinite(t.annees) && t.annees > 0 && Number.isFinite(t.ytmPct) && Number.isFinite(t.couponPct) && t.couponPct >= 0);
  /* Départ : le rendement lui-même, qui est déjà juste pour tout ce qui n'a
     qu'un seul flux, et n'est pas loin pour le reste. */
  let courant = bons.map((t) => ({ ...t, spotPct: t.ytmPct }));

  for (let passage = 0; passage < 10; passage++) {
    const courbe = interpoler(courant);
    let bouge = 0;
    const suivant = courant.map((t) => {
      /* Un seul flux : le rendement EST le taux zéro-coupon, sans calcul. */
      if (t.couponPct === 0 || fluxRestants(t.annees).length === 1) return { ...t, spotPct: t.ytmPct };
      const z = spotDe(t, courbe);
      if (z == null) return t;
      bouge = Math.max(bouge, Math.abs(z - t.spotPct));
      return { ...t, spotPct: z };
    });
    courant = suivant;
    if (bouge < 1e-9) break;
  }

  return courant.map((t) => ({
    ...t,
    depouille: t.couponPct > 0 && fluxRestants(t.annees).length > 1,
    ecartPb: Math.round((t.spotPct - t.ytmPct) * 100),
  }));
}
