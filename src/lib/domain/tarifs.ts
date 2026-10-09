/**
 * L'ANNEXE TARIFAIRE, ET POURQUOI ELLE N'EST PAS UN SECOND MAGASIN DE PRIX.
 *
 * La convention la cite depuis le début, à l'article 6 : « les conditions
 * tarifaires applicables sont celles de l'annexe tarifaire remise par le
 * conseiller ». Cette annexe n'existait pas. Un texte opposable renvoyait donc
 * à un document que personne n'avait écrit, et c'est la pire espèce de
 * promesse : elle n'a l'air de rien tant qu'un client ne la réclame pas.
 *
 * LE PRIX N'AVAIT PAS DE DOMICILE. Il vit en quatre endroits qui s'ignorent :
 * la commission d'une ligne (`Offer.commissionPct`), les droits d'entrée et de
 * sortie d'un fonds (`Offer.fund`), le barème de garde (`domain/garde.ts`), et
 * le reste, qui n'existait nulle part. Personne ne pouvait répondre à « que
 * prenons-nous ? » sans ouvrir quatre écrans.
 *
 * CE MODULE NE RANGE DONC QUE CE QUI N'A PAS DÉJÀ UN TOIT, et l'annexe
 * COMPOSE le reste à la lecture. Recopier ici le barème de garde ou les droits
 * d'entrée d'un fonds aurait créé deux vérités, et c'est toujours la plus
 * ancienne qui finit par s'afficher.
 *
 * TOUT EST À ZÉRO, ET C'EST L'ÉTAT RÉEL, pas un réglage d'usine. Même raison
 * que le barème de garde : un prix posé par défaut « pour que ça marche »
 * serait un prélèvement décidé par le code, et cette décision n'appartient pas
 * au code. La maison facture zéro sur toutes ses lignes au 9 octobre 2026, et
 * l'annexe le dit plutôt que de laisser la page vide.
 */

/** Ce que la maison prend, et qui n'a pas d'autre domicile. */
export interface Tarifs {
  /** La commission par défaut d'un ordre, en % du montant. */
  commissionPct: number;
  /** Le plancher de commission par ordre, en francs, appliqué à ce qui est déjà dû. */
  commissionMin: number;
  /** Ce que coûte un versement du solde vers la banque du client. */
  versementSortant: number;
  /** Un duplicata de document déjà émis. */
  duplicata: number;
  /** Le jour d'entrée en vigueur, que le préavis de trente jours de l'article 6 compte à rebours. */
  effetLe?: string;
}

/**
 * Le tarif fermé : rien n'est pris.
 *
 * `commissionMin` ne s'applique qu'à une commission déjà due, exactement comme
 * le plancher des droits de garde : sans cette règle, zéro pour cent
 * prélèverait le minimum, ce qui est le prélèvement accidentel qu'on veut
 * empêcher.
 */
export const TARIFS_FERMES: Tarifs = { commissionPct: 0, commissionMin: 0, versementSortant: 0, duplicata: 0 };

/** La maison prend-elle quelque chose sur un ordre ? */
export const commissionOuverte = (t: Tarifs): boolean => t.commissionPct > 0;

/** Ce qu'un ordre doit, plancher compris, et jamais sur un tarif fermé. */
export function commissionDue(t: Tarifs, montant: number): number {
  if (!commissionOuverte(t) || montant <= 0) return 0;
  return Math.max(Math.round((montant * t.commissionPct) / 100), t.commissionMin);
}

/**
 * LA FOURCHETTE DES DROITS D'ENTRÉE, LUE DES FONDS EUX-MÊMES.
 *
 * « De 0 à 3 % selon le fonds » est vrai le jour où on l'écrit et faux le
 * mois suivant. La phrase se calcule donc, et quand aucun fonds n'est ouvert
 * à la souscription elle ne s'invente pas : elle se tait.
 */
export function fourchetteDesDroits(fonds: { entryFeePct?: number }[]): { min: number; max: number } | undefined {
  const taux = fonds.map((f) => f.entryFeePct).filter((x): x is number => typeof x === "number");
  if (!taux.length) return undefined;
  return { min: Math.min(...taux), max: Math.max(...taux) };
}

/**
 * Les lignes de l'annexe qui ne dépendent d'aucun réglage.
 *
 * Elles sont ici et non dans la page parce qu'un tarif qui ne se facture pas
 * doit être NOMMÉ : un service absent de la liste finit par être réclamé un
 * jour, et c'est alors la parole du client contre la nôtre.
 */
export const GRATUITS: string[] = [
  "Ouverture du compte-titres, et du sous-compte chez le teneur de compte",
  "Versement de votre solde vers votre compte bancaire",
  "Mandat de prélèvement, et chaque prélèvement présenté",
  "Épargne programmée, et chacun de ses préavis",
  "Bulletins, avis d'opéré, relevés, attestations et duplicata",
  "Clôture du compte",
];
