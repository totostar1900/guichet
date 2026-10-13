import type { BocEncours } from "./boc-parse";

/**
 * L'ENCOURS DES TITRES DE DETTE : LE STOCK, LÀ OÙ LES ADJUDICATIONS DONNENT DES FLUX.
 *
 * POURQUOI CE N'EST PAS UNE COMMODITÉ. Le mur des échéances, le service de la
 * dette, la part de chaque Trésor dans l'endettement régional : tout cela se
 * calcule à partir d'un encours. Nous n'avions que les adjudications, donc des
 * flux, et notre collecte n'en couvre qu'un quart. Un encours reconstitué à
 * partir d'un quart des flux a l'apparence d'un chiffre et la nature d'une
 * hypothèse ; publié tel quel, il aurait été faux de façon invérifiable.
 *
 * La seconde table de la section « CAPITALISATION BOURSIERE ET ENCOURS DES
 * TITRES DE DETTE » publie ce stock, ligne par ligne, à chaque séance. Un
 * stock publié est complet par construction : il n'y a rien à reconstituer.
 *
 * ET LA LIGNE SE VÉRIFIE ELLE-MÊME. Aucune n'entre sans que
 * titres × nominal résiduel × cours / 100 égale l'encours imprimé, à une unité
 * du dernier décimal près. C'est le seul garde contre la grille du PDF, qui
 * coupe les nombres en deux ; il vit dans le lecteur, et rien n'écrit dans
 * cette table par un autre chemin.
 */
export interface EncoursDette extends BocEncours {
  /** La séance qui publie ce relevé. */
  sessionDate: string;
  /** La version du lecteur qui a écrit la ligne, pour qu'une relecture sache ce qu'elle gagne. */
  readerVersion?: number;
}

/**
 * Les bornes d'un coupon donnent le couru sans aucune hypothèse de calendrier.
 *
 * C'est tout l'intérêt d'avoir les DEUX dates imprimées : la part écoulée se
 * lit directement, sans convention de base ni calendrier d'échéances à
 * reconstruire. Hors de l'intervalle, la question n'a pas de sens, et rendre
 * zéro vaut mieux que rendre un nombre qu'on ne saurait pas défendre.
 */
export const couponCouru = (e: EncoursDette, le: string): number => {
  const parAn: Record<string, number> = { AN: 1, SEM: 2, TRIM: 4, MENS: 12 };
  const n = parAn[(e.periodicity ?? "").toUpperCase()];
  if (!n || !e.previousCouponOn || !e.nextCouponOn) return 0;
  const debut = Date.parse(`${e.previousCouponOn}T12:00:00Z`);
  const fin = Date.parse(`${e.nextCouponOn}T12:00:00Z`);
  const t = Date.parse(`${le}T12:00:00Z`);
  if (!(fin > debut) || t < debut || t > fin) return 0;
  return ((e.nominalRemaining * e.couponRate) / 100 / n) * ((t - debut) / (fin - debut));
};

/** L'encours d'une séance, par émetteur, du plus lourd au plus léger. */
export const parEmetteur = (lignes: EncoursDette[]): { issuer: string; outstanding: number; lignes: number }[] => {
  const m = new Map<string, { issuer: string; outstanding: number; lignes: number }>();
  for (const l of lignes) {
    const e = m.get(l.issuer) ?? { issuer: l.issuer, outstanding: 0, lignes: 0 };
    e.outstanding += l.outstanding;
    e.lignes += 1;
    m.set(l.issuer, e);
  }
  return [...m.values()].sort((a, b) => b.outstanding - a.outstanding);
};
