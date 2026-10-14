/**
 * LE COUPON RÉVÈLE SON PRINCIPAL, ET C'EST CE QUI DÉBLOQUE L'ENCOURS ADJUGÉ.
 *
 * Le marché primaire de la zone n'a aucune table d'encours. Les communiqués de
 * résultats n'en couvrent que 82 levées sur 536, et le tableau de bord
 * hebdomadaire, qui les couvre toutes, n'annonce pour les émissions que des
 * INTENTIONS de lever. Aucune des deux sources ne donne donc le stock.
 *
 * LA TROISIÈME LECTURE EST DANS LE COUPON. Un paiement d'intérêts est
 * contractuel, exact, et le tableau imprime à côté le taux facial :
 *
 *   Cameroun, CM2B00000053 OTA 5 ANS 5,50%
 *   paiement d'intérêts  2 750 000 000 F   le 26 février 2026
 *   remboursement       50 000 000 000 F   le 26 février 2026
 *
 *   2 750 000 000 ÷ 5,50 % = 50 000 000 000, au franc près.
 *
 * MESURÉ LE 14 OCTOBRE 2026 : sur 80 lignes où un coupon ET un remboursement
 * sont vus, l'identité tient 69 fois au millième. ZÉRO semestriel, ZÉRO
 * trimestriel : le coupon de ces obligations est annuel, et ce n'était pas
 * acquis, les obligations cotées du BOC payant parfois au semestre.
 *
 * LES ONZE AUTRES NE SONT PAS DU BRUIT, ELLES SONT DE L'INFORMATION, et c'est
 * la partie qu'il ne faut pas jeter :
 *
 *   un rapport voisin de 1 vient du DÉCOMPTE DE JOURS, une première période
 *   comptant 367 jours plutôt que 365 ;
 *
 *   un rapport nettement supérieur à 1 dit une ligne AMORTISSABLE : le coupon
 *   se paie sur le capital restant, le remboursement n'est que la tranche
 *   due, et leur rapport donne le nombre de tranches. Le Gabon GA2J00000135
 *   sort à 3,1, soit un tiers du capital rendu ;
 *
 *   un remboursement rigoureusement ÉGAL au coupon est une étiquette fautive,
 *   la même somme ayant été rangée deux fois.
 *
 * C'est donc aussi la première mesure directe de l'amortissement du marché
 * primaire, que l'encours reconstitué devait jusqu'ici supposer in fine.
 */

/** Un paiement d'intérêts, tel que le tableau de bord l'imprime. */
export interface Coupon {
  code: string;
  /** Le taux facial, en pour cent : 5,50 s'écrit 5.5. */
  taux: number;
  /** En francs. */
  montant: number;
  le: string;
}

/**
 * Le principal que ce coupon implique, si le coupon est annuel.
 *
 * Rend `undefined` plutôt qu'un chiffre quand le taux manque ou qu'il est
 * absurde : un taux nul diviserait par zéro, et un taux au-delà de trente
 * pour cent n'est pas un taux facial souverain, c'est une cellule mal lue.
 */
export const TAUX_MAX = 30;

export function principalDuCoupon(c: Pick<Coupon, "taux" | "montant">): number | undefined {
  if (!(c.taux > 0) || c.taux > TAUX_MAX || !(c.montant > 0)) return undefined;
  return c.montant / (c.taux / 100);
}

export type Nature = "in_fine" | "decompte_de_jours" | "amortissable" | "etiquette_douteuse" | "pas_encore_rendue" | "indecidable";

export interface Lecture {
  nature: Nature;
  /** Le principal déduit du coupon, en francs. */
  principal?: number;
  /** Le rapport principal déduit sur capital rendu : il porte toute la lecture. */
  rapport?: number;
  /** Le nombre de tranches qu'implique le rapport, pour une ligne amortissable. */
  tranches?: number;
  dit: string;
}

/**
 * Ce que le couple coupon / remboursement dit de la ligne.
 *
 * LES BORNES SONT TIRÉES DE LA MESURE, pas choisies. Un rapport sous 1,02
 * couvre le décompte de jours (367 ÷ 365 vaut 1,0055) ; au-delà de 1,10, les
 * six cas mesurés vont de 1,16 à 3,1 et aucun ne s'explique autrement que par
 * un amortissement. Entre les deux, rien n'a été observé, et on le dit plutôt
 * que de trancher.
 */
export function lireLeCouple(coupon: Pick<Coupon, "taux" | "montant">, rembourse: number): Lecture {
  const principal = principalDuCoupon(coupon);
  if (principal === undefined) return { nature: "indecidable", dit: "taux absent ou hors de toute échelle : le principal ne se déduit pas." };
  /* PAS DE REMBOURSEMENT VU N EST PAS UNE IGNORANCE, C EST UN ÉTAT : la ligne
     vit encore, ou elle a été rendue dans une semaine que le livre ne couvre
     pas. Le principal déduit reste bon ; c est son recoupement qui manque, et
     ranger cela sous « indécidable » ferait passer 194 lignes saines pour des
     échecs de lecture. */
  if (!(rembourse > 0)) return { nature: "pas_encore_rendue", principal, dit: "aucun remboursement vu : le principal déduit tient, mais rien ne le recoupe." };

  /* Le même montant des deux côtés n'est pas un rapport, c'est un doublon de
     rangement : on le dit avant de calculer quoi que ce soit. */
  if (Math.abs(coupon.montant - rembourse) <= 1) {
    return { nature: "etiquette_douteuse", principal, rapport: principal / rembourse, dit: "le remboursement égale le coupon au franc près : la même somme a été rangée deux fois." };
  }

  const rapport = principal / rembourse;
  if (Math.abs(rapport - 1) <= 0.001) return { nature: "in_fine", principal, rapport, dit: "le capital rendu égale le principal déduit : remboursement en une fois." };
  if (rapport > 1 && rapport <= 1.02) {
    return { nature: "decompte_de_jours", principal, rapport, dit: `le coupon dépasse de ${((rapport - 1) * 100).toFixed(1)} % : une période de plus de trois cent soixante-cinq jours, et non un amortissement.` };
  }
  if (rapport > 1.1) {
    const tranches = Math.round(rapport);
    return {
      nature: "amortissable",
      principal,
      rapport,
      tranches: tranches >= 2 ? tranches : undefined,
      dit: `le coupon se paie sur ${rapport.toFixed(2)} fois le capital rendu : la ligne s'amortit${tranches >= 2 ? `, en ${tranches} tranches environ` : ""}.`,
    };
  }
  return { nature: "indecidable", principal, rapport, dit: `rapport de ${rapport.toFixed(3)} : ni un décompte de jours ni un amortissement reconnaissable.` };
}

/** Le principal d'une ligne à la date de son coupon, quand il se déduit. */
export interface Encours {
  code: string;
  principal: number;
  /** La date à laquelle ce principal vaut : celle du coupon. */
  le: string;
  nature: Nature;
}

/**
 * Le dernier principal connu de chaque ligne.
 *
 * ON GARDE LE COUPON LE PLUS RÉCENT, et c'est une décision : sur une ligne
 * amortissable, le coupon diminue avec le capital, donc le dernier vu est le
 * plus proche de l'encours d'aujourd'hui. Sur une ligne in fine il ne change
 * pas, et le choix est sans effet.
 */
export function dernierPrincipalConnu(coupons: Coupon[]): Map<string, Encours> {
  const out = new Map<string, Encours>();
  /* Une date absente ne doit ni faire tomber le tri ni primer sur une date
     connue : elle passe en premier, donc un coupon daté l emporte toujours. */
  for (const c of [...coupons].sort((a, b) => (a.le ?? "").localeCompare(b.le ?? ""))) {
    const principal = principalDuCoupon(c);
    if (principal === undefined) continue;
    out.set(c.code, { code: c.code, principal, le: c.le, nature: "indecidable" });
  }
  return out;
}
