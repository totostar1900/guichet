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
 *
 * UN SEUL NOMBRE, ET PAS DE PLAFOND — décidé le 25 octobre 2026.
 *
 * Le mandat portait deux montants : celui qu'on prélève et un plafond
 * « au-delà duquel la maison ne va jamais ». Le second était emprunté au
 * plafond « au plus » d'un ordre de bourse, où il protège d'un prix inconnu à
 * la signature. ICI RIEN N'EST INCONNU : le client écrit la somme, et c'est
 * cette somme-là qui est présentée à sa banque, ni plus ni moins. Un second
 * nombre ne protégeait donc de rien ; il faisait chercher lequel des deux
 * serait débité, et il ouvrait la seule question qu'un mandat ne doit jamais
 * poser — « combien, exactement ? ».
 *
 * Le montant présenté n'est plus « au plus le signé » : il EST le signé.
 */

/** Ce que le mandat alimente. Un mandat par usage : jamais les deux. */
export type ObjetDuMandat = "provision" | "instruction";

/**
 * Actif, suspendu, révoqué.
 *
 * « Révoqué » ne supprime rien, et c'est la règle des instructions vivantes :
 * une contestation porte sur un tirage passé, donc l'historique doit survivre
 * à la révocation. « Suspendu » est l'état où la maison s'ARRÊTE d'elle-même,
 * après deux mois refusés de suite, pour ne pas faire casser le mandat par la
 * banque du client. Le mot que le CLIENT lit est « arrêté » : « suspendu »
 * décrit ce que la maison peut reprendre, « arrêté » ce qui ne prélèvera plus
 * tant que personne n'aura repris les choses avec lui.
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
  /** Le jour du mois, de 1 à 28, quand le mandat porte son propre calendrier. */
  dayOfMonth?: number;
  /**
   * LE MONTANT, en FCFA : celui que le client a écrit, et le seul qu'il y ait.
   *
   * C'est lui qui est présenté à la banque, ni plus ni moins. Il n'y a pas de
   * plafond à côté : voir l'en-tête de ce fichier.
   */
  amount: number;
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
  /** Combien de mois refusés de suite : au second, la maison arrête d'elle-même. */
  rejects?: number;
  createdAt: string;
  updatedAt: string;
}

export type NewMandat = Pick<MandatPrelevement, "userId" | "objet" | "standingId" | "bankName" | "bankAccount" | "accountHolder" | "dayOfMonth" | "amount">;

/**
 * LE JOUR VA DE 1 À 28, comme pour les instructions permanentes.
 *
 * Tous les mois ont ces jours-là. Accepter le 31 obligerait quelqu'un à
 * décider ce qu'on fait en février, et cette décision n'appartient pas à la
 * maison : elle appartient au client, qui n'est pas là ce jour-là.
 */
export const JOUR_MIN = 1;
export const JOUR_MAX = 28;

/**
 * DEUX MOIS REFUSÉS DE SUITE, ET LA MAISON ARRÊTE.
 *
 * Un mois refusé est sauté : on ne représente rien avant l'échéance suivante.
 * Si celle-ci est refusée à son tour, le mandat s'arrête de lui-même — un
 * prélèvement qui s'acharne se fait casser par la banque du client, et chaque
 * rejet lui coûte souvent des frais.
 *
 * « Consécutifs » est le mot qui compte : le compteur repart de zéro au premier
 * encaissement, parce que deux rejets séparés par six mois de prélèvements
 * réussis ne sont pas un acharnement.
 */
export const MOIS_REFUSES_AVANT_ARRET = 2;

/** Ce qui cloche dans un mandat proposé, ou rien. */
export function verifierLeMandat(m: Partial<NewMandat>): string | undefined {
  if (!m.accountHolder?.trim()) return "Le titulaire du compte à débiter doit être nommé.";
  if (!m.bankAccount?.trim()) return "Le RIB ou l'IBAN du compte à débiter est requis.";
  if (!m.bankName?.trim()) return "La banque du compte à débiter est requise.";
  /* UN SEUL MONTANT, ET IL EST OBLIGATOIRE DES DEUX CÔTÉS. Il l'était pour la
     provision seulement ; une épargne programmée tenait le sien de
     l'instruction, ce qui laissait un mandat sans chiffre signé. Or ce qui est
     présenté à la banque est ce que le client a écrit. */
  if (!m.amount || m.amount <= 0) return "Indiquez le montant à prélever chaque mois : c'est lui qui sera présenté à votre banque, ni plus ni moins.";
  if (m.objet === "provision" && (!m.dayOfMonth || m.dayOfMonth < JOUR_MIN || m.dayOfMonth > JOUR_MAX)) {
    return `Choisissez un jour du mois entre ${JOUR_MIN} et ${JOUR_MAX} : tous les mois ont ces jours-là.`;
  }
  if (m.objet === "instruction" && !m.standingId) return "Un mandat qui alimente une instruction doit dire laquelle.";
  return undefined;
}

/** Un mandat prélève-t-il encore ? Signé, actif, non révoqué. */
export const mandatVivant = (m: MandatPrelevement): boolean => m.state === "actif" && Boolean(m.signedAt);

/**
 * NI PLUS, NI MOINS : le montant présenté est CELUI du mandat.
 *
 * La règle était « au plus le plafond signé », ce qui autorisait tout montant
 * inférieur — c'est-à-dire la maison décidant du chiffre. Un prélèvement plus
 * petit que celui annoncé n'est pas une prudence : c'est une épargne qui se
 * remplit moins vite que ce que le client a lu, sans qu'il l'apprenne.
 */
export const tirageAutorise = (m: MandatPrelevement, montant: number): boolean => mandatVivant(m) && montant === m.amount;
