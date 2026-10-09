/**
 * LE MANDAT DE PRÉLÈVEMENT : la maison tire, au lieu que le client pousse.
 *
 * Tout ce qui a été construit jusqu'ici va dans un sens : le client signe,
 * puis il vire. Le prélèvement inverse la direction, et c'est pour cela qu'il
 * change plus de choses qu'il n'en a l'air.
 *
 *   IL REND L'ÉPARGNE PROGRAMMÉE AUTONOME. Aujourd'hui l'instruction
 *   permanente suppose que l'argent soit déjà là : au jour dit, solde vide,
 *   rien ne part. C'est une épargne qui demande au client de penser à
 *   l'alimenter, c'est-à-dire exactement ce qu'elle est censée lui éviter.
 *
 *   IL SUPPRIME LA RÉFÉRENCE RECOPIÉE. La banque a refusé un numéro de compte
 *   par client le 9 octobre 2026 ; un prélèvement n'a pas ce problème, puisque
 *   c'est la maison qui émet l'opération, avec son propre identifiant.
 *
 *   IL DÉPLACE LE RISQUE, ET IL FAUT LE DIRE. Un virement qui n'arrive pas est
 *   un non-événement. Un prélèvement qui échoue est un REJET : il coûte, il se
 *   répète, et il use la relation du client avec sa banque. « Pourvu qu'il y
 *   ait les fonds » n'est pas une condition qu'on vérifie, c'est un échec
 *   qu'on encaisse et qu'il faut traiter.
 *
 * DEUX DÉCISIONS DE LA MAISON, prises le 9 octobre 2026, et ce fichier les
 * porte plutôt que de les laisser à chaque écran.
 *
 *   UN MANDAT PAR USAGE. Un mandat « épargne programmée de 50 000 par mois »
 *   se lit, se conteste et se révoque sans rien casser d'autre. Un mandat
 *   général « prélevez ce qu'il faut » est juridiquement fragile et
 *   commercialement effrayant.
 *
 *   CALENDRIER SEULEMENT, pas de tirage à la demande. Un tirage immédiat
 *   serait confortable à écrire et trompeur à l'usage : il porte un délai
 *   d'encaissement que le client ne voit pas et qui le fait attendre quand
 *   même. Pour le reste, le virement.
 */

/** Ce que le mandat alimente. Un mandat par usage : jamais les deux. */
export type ObjetDuMandat = "provision" | "instruction";

/**
 * Actif, suspendu, révoqué.
 *
 * « Révoqué » ne supprime rien, et c'est la règle des instructions vivantes :
 * une contestation porte sur un tirage passé, donc l'historique doit survivre
 * à la révocation. « Suspendu » est l'état où la maison s'arrête d'elle-même,
 * après deux rejets, pour ne pas faire casser le mandat par la banque du
 * client.
 */
export type EtatDuMandat = "actif" | "suspendu" | "revoque";

export interface MandatPrelevement {
  id: string;
  /** La référence unique, imprimée sur chaque prélèvement et citée dans toute contestation. */
  ref: string;
  userId: string;
  objet: ObjetDuMandat;
  /** L'instruction permanente alimentée, quand l'objet en est une. */
  standingId?: string;
  /** Le compte à débiter : AU NOM DU CLIENT, jamais un tiers. */
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  /**
   * Le plafond par échéance, en FCFA.
   *
   * C'est le même objet que le plafond « au plus » d'un ordre, et la même
   * phrase de la convention : la maison ne vous engage jamais au-delà de ce
   * que vous avez signé. Ici elle ne vous PRÉLÈVE jamais au-delà.
   */
  maxAmount: number;
  /** Le jour du mois, de 1 à 28, quand le mandat porte son propre calendrier. */
  dayOfMonth?: number;
  /** Le montant à prélever, quand le mandat alimente la provision. */
  amount?: number;
  state: EtatDuMandat;
  signedAt?: string;
  signedMethod?: string;
  signedTo?: string;
  /** L'exemplaire signé : c'est lui qui fait foi, pas la ligne en base. */
  docId?: string;
  /** Le code à usage unique en cours, comme ailleurs dans la maison. */
  pendingCodeHash?: string;
  pendingCodeAt?: string;
  pendingCodeTries?: number;
  pendingCodeTo?: string;
  revokedAt?: string;
  revokedReason?: string;
  /** Combien de rejets consécutifs : au second, la maison suspend d'elle-même. */
  rejects?: number;
  createdAt: string;
  updatedAt: string;
}

export type NewMandat = Pick<MandatPrelevement, "userId" | "objet" | "standingId" | "bankName" | "bankAccount" | "accountHolder" | "maxAmount" | "dayOfMonth" | "amount">;

/**
 * LE JOUR VA DE 1 À 28, comme pour les instructions permanentes.
 *
 * Tous les mois ont ces jours-là. Accepter le 31 obligerait quelqu'un à
 * décider ce qu'on fait en février, et cette décision n'appartient pas à la
 * maison : elle appartient au client, qui n'est pas là ce jour-là.
 */
export const JOUR_MIN = 1;
export const JOUR_MAX = 28;

/** Au second rejet consécutif, la maison suspend : un mandat qui s'acharne se fait casser par la banque. */
export const REJETS_AVANT_SUSPENSION = 2;

/** Ce qui cloche dans un mandat proposé, ou rien. */
export function verifierLeMandat(m: Partial<NewMandat>): string | undefined {
  if (!m.accountHolder?.trim()) return "Le titulaire du compte à débiter doit être nommé.";
  if (!m.bankAccount?.trim()) return "Le RIB ou l'IBAN du compte à débiter est requis.";
  if (!m.bankName?.trim()) return "La banque du compte à débiter est requise.";
  if (!m.maxAmount || m.maxAmount <= 0) return "Un mandat sans plafond n'en est pas un : indiquez le montant maximum par échéance.";
  if (m.objet === "provision") {
    if (!m.amount || m.amount <= 0) return "Indiquez le montant à prélever chaque mois.";
    if (m.amount > m.maxAmount) return "Le montant prélevé ne peut pas dépasser le plafond que vous signez.";
    if (!m.dayOfMonth || m.dayOfMonth < JOUR_MIN || m.dayOfMonth > JOUR_MAX) return `Choisissez un jour du mois entre ${JOUR_MIN} et ${JOUR_MAX} : tous les mois ont ces jours-là.`;
  }
  if (m.objet === "instruction" && !m.standingId) return "Un mandat qui alimente une instruction doit dire laquelle.";
  return undefined;
}

/** Un mandat prélève-t-il encore ? Signé, actif, non révoqué. */
export const mandatVivant = (m: MandatPrelevement): boolean => m.state === "actif" && Boolean(m.signedAt);

/** Un tirage ne dépasse jamais le plafond signé, et c'est la seule règle qui compte au moment de tirer. */
export const tirageAutorise = (m: MandatPrelevement, montant: number): boolean => mandatVivant(m) && montant > 0 && montant <= m.maxAmount;
