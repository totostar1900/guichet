/**
 * CE QUI S'EST VRAIMENT PASSÉ, QUAND LE COURS NE BOUGE PAS.
 *
 * Mesuré le 5 octobre 2026 sur la base de production : l'indice bouge sur 70
 * des 271 séances lues depuis le 1er septembre 2025, et sur les 1 733 couples
 * action-séance le cours ne change que dans 79, soit 4,6 %. Une page bâtie sur
 * la variation du jour affiche donc des zéros trois fois sur quatre. Ce n'est
 * pas une panne, c'est le marché ; mais une page dont tous les nombres valent
 * zéro se lit comme une panne.
 *
 * Deux lectures manquaient, et elles sont dans la base depuis le premier jour :
 * quand le cours a bougé pour la dernière fois, et ce qui s'est échangé. La
 * seconde ne se déduit pas de la première : SOCAP a vu 877 titres changer de
 * mains le 1er octobre, et son cours n'avait pas bougé depuis le 15 juillet.
 * Échanger n'est pas bouger.
 */

/** Une séance de cette ligne, réduite à ce qui nous intéresse ici. */
export interface Seance {
  sessionDate: string;
  variationPct: number;
}

/**
 * La dernière séance où ce cours a bougé, s'il a bougé.
 *
 * Le seuil est celui de l'affichage : une variation que l'écran arrondit à
 * « 0,00 % » n'est pas un mouvement pour le lecteur, et prétendre le contraire
 * daterait un mouvement invisible.
 */
export const dernierMouvement = (quotes: Seance[]): string | undefined =>
  quotes
    .filter((q) => Math.abs(q.variationPct) >= 0.005)
    .map((q) => q.sessionDate)
    .sort()
    .pop();

/** Ce qui s'est échangé sur une séance, et le mois qui la précède pour l'échelle. */
export interface Echanges {
  /** Les lignes servies, et sur combien de cotées. */
  lignes: number;
  cotees: number;
  transactions: number;
  titres: number;
  montant: number;
  /** Les lignes servies, la plus grosse d'abord. */
  servies: { mnemo: string; titres: number }[];
  /** Les trente jours qui précèdent, séance comprise. */
  fenetreMontant: number;
  fenetreSeances: number;
  /** La part de cette séance dans la fenêtre, en pourcentage, quand elle a un sens. */
  part?: number;
}

const ilYA = (iso: string, jours: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - jours * 86400e3).toISOString().slice(0, 10);

/**
 * `trading` : séance → ce qui s'y est échangé, action par action.
 *
 * La fenêtre sert d'échelle, et elle en a besoin : une séance isolée ne dit
 * pas si 53 millions sont beaucoup. Sur la cote de la BVMAC, cette séance-là
 * pesait la moitié du mois entier.
 */
export function echangesDeLaSeance(trading: Map<string, { titles: number; amount: number; trades: number; shares: Record<string, { titles: number }> }>, seance: string, cotees: number): Echanges | undefined {
  const s = trading.get(seance);
  if (!s) return undefined;
  const servies = Object.entries(s.shares)
    .filter(([, v]) => v.titles > 0)
    .map(([mnemo, v]) => ({ mnemo, titres: v.titles }))
    .sort((a, b) => b.titres - a.titres);
  const depuis = ilYA(seance, 30);
  let fenetreMontant = 0;
  let fenetreSeances = 0;
  for (const [d, v] of trading) {
    if (d <= seance && d > depuis) {
      fenetreMontant += v.amount;
      fenetreSeances += 1;
    }
  }
  return {
    lignes: servies.length,
    cotees,
    transactions: s.trades,
    titres: s.titles,
    montant: s.amount,
    servies,
    fenetreMontant,
    fenetreSeances,
    /* Sans montant sur la fenêtre, il n'y a pas de part à donner : 0 sur 0
       s'afficherait comme « 0 % », ce qui est une affirmation, pas un vide. */
    part: fenetreMontant > 0 ? (s.amount / fenetreMontant) * 100 : undefined,
  };
}
