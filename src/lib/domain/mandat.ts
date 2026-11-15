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
  /**
   * LA COPIE SIGNÉE À LA MAIN (décision du 15 novembre 2026, maquette « Signature manuelle » : 1A).
   *
   * Un mandat créé depuis cette date se signe deux fois : par code (le consentement, en ligne) puis à la main, sur le même document, déposé à la banque du client
   * dont une copie vient au desk. Le prélèvement attend la vérification de cette copie. Les mandats déjà actifs ne sont pas concernés (`copieRequise` absent).
   */
  copieRequise?: boolean;
  copieKey?: string;
  copieNom?: string;
  copieType?: string;
  copieRecueLe?: string;
  verifieLe?: string;
  verifiePar?: string;
  /** Le motif du dernier refus, pris dans MOTIFS_DE_REFUS_DE_COPIE. */
  refusMotif?: string;
  refusLe?: string;
  /** Le rappel envoyé quand la copie tarde : une seule fois. */
  relanceLe?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewMandat = Pick<MandatPrelevement, "userId" | "objet" | "standingId" | "bankName" | "bankAccount" | "accountHolder" | "dayOfMonth" | "amount"> & { copieRequise?: boolean };

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

/** Les bornes de saisie, tenues ici pour que la phrase et la règle ne divergent pas. */
export const NOM_MIN = 2;
export const COMPTE_MIN = 6;

/**
 * Ce qui cloche dans un mandat proposé, ou rien.
 *
 * ─── POURQUOI TOUTES LES RÈGLES SONT ICI ───────────────────────────────────
 *
 * RELEVÉ LE 27 OCTOBRE 2026, en conduisant l'application avec des données
 * factices, comme un client l'avait fait. Trois saisies différentes — un
 * montant vide, un montant « abc », une banque d'une lettre — rendaient TOUTES
 * la même phrase : « Vérifiez les champs : banque, compte, titulaire,
 * montant. » Quatre champs nommés, aucun désigné, et rien sur la raison.
 *
 * Les bonnes phrases existaient pourtant, juste en dessous — « Indiquez le
 * montant à prélever chaque mois : c'est lui qui sera présenté à votre
 * banque » — et elles étaient INATTEIGNABLES : le contrôle de forme passait en
 * premier et rendait sa phrase générique pour tout ce qu'il rejetait. Du code
 * mort, donc, pour précisément les cas où le client a besoin d'être guidé.
 *
 * Les longueurs minimales vivaient dans le schéma de l'action, où elles
 * n'avaient pas de mots. Elles sont ici désormais : une règle et sa phrase se
 * tiennent au même endroit, sinon l'une bouge sans l'autre. Le schéma reste la
 * garde de TYPE ; celui-ci est la garde de SENS, et c'est lui qui parle au
 * client.
 *
 * C'est la façon de faire du reste de la maison : l'ouverture de compte nomme
 * chaque manque, et `missingForSubmission` en rend la liste en toutes lettres.
 */
export function verifierLeMandat(m: Partial<NewMandat>): string | undefined {
  if (!m.accountHolder?.trim()) return "Le titulaire du compte à débiter doit être nommé.";
  if (m.accountHolder.trim().length < NOM_MIN) return `Le nom du titulaire est trop court : ${NOM_MIN} caractères au moins, tel qu'il est écrit sur le compte.`;
  if (!m.bankAccount?.trim()) return "Le RIB ou l'IBAN du compte à débiter est requis.";
  if (m.bankAccount.replace(/\s/g, "").length < COMPTE_MIN) return `Ce RIB ou IBAN est trop court pour être un numéro de compte : votre banque vous le donne en entier, sur votre relevé.`;
  if (!m.bankName?.trim()) return "La banque du compte à débiter est requise.";
  if (m.bankName.trim().length < NOM_MIN) return `Le nom de la banque est trop court : ${NOM_MIN} caractères au moins.`;
  /* UN SEUL MONTANT, ET IL EST OBLIGATOIRE DES DEUX CÔTÉS. Il l'était pour la
     provision seulement ; une épargne programmée tenait le sien de
     l'instruction, ce qui laissait un mandat sans chiffre signé. Or ce qui est
     présenté à la banque est ce que le client a écrit. */
  if (!m.amount || m.amount <= 0) return "Indiquez le montant à prélever chaque mois, en chiffres : c'est lui qui sera présenté à votre banque, ni plus ni moins.";
  if (m.objet === "provision" && (!m.dayOfMonth || m.dayOfMonth < JOUR_MIN || m.dayOfMonth > JOUR_MAX)) {
    return `Choisissez un jour du mois entre ${JOUR_MIN} et ${JOUR_MAX} : tous les mois ont ces jours-là.`;
  }
  if (m.objet === "instruction" && !m.standingId) return "Un mandat qui alimente une instruction doit dire laquelle.";
  return undefined;
}

/**
 * OÙ EN EST UN MANDAT, DU CÔTÉ DU CLIENT (15 novembre 2026). Calculé, jamais rangé : l'étape se déduit des dates.
 *
 *   a_signer         pas encore signé par code
 *   copie_attendue   signé par code ; la copie signée à la main n'est pas venue
 *   en_verification  la copie est reçue ; le desk la vérifie
 *   copie_refusee    la dernière copie a été refusée, et aucune plus récente n'est venue
 *   actif            prélève (copie vérifiée, ou mandat d'avant la règle)
 */
export type EtapeDuMandat = "a_signer" | "copie_attendue" | "en_verification" | "copie_refusee" | "actif";

type PourLEtape = Pick<MandatPrelevement, "signedAt" | "copieRequise" | "copieRecueLe" | "verifieLe" | "refusLe">;

export function etapeDuMandat(m: PourLEtape): EtapeDuMandat {
  if (!m.signedAt) return "a_signer";
  if (!m.copieRequise || m.verifieLe) return "actif";
  if (m.refusLe && (!m.copieRecueLe || m.refusLe >= m.copieRecueLe)) return "copie_refusee";
  if (m.copieRecueLe) return "en_verification";
  return "copie_attendue";
}

/** Les raisons qu'un desk peut donner en refusant une copie : une liste fermée, que le client lit. */
export const MOTIFS_DE_REFUS_DE_COPIE = {
  signature_illisible: "La signature est illisible.",
  titulaire_different: "Le titulaire n'est pas celui de votre dossier.",
  rib_different: "Le RIB n'est pas celui du mandat.",
  copie_incomplete: "La copie est incomplète : toute la page doit se lire.",
} as const;
export type MotifDeRefusDeCopie = keyof typeof MOTIFS_DE_REFUS_DE_COPIE;

/** Ce qu'on accepte comme copie : un PDF, une photo ou un scan, 10 Mo au plus. */
export const COPIE_FORMATS = ["application/pdf", "image/jpeg", "image/png"] as const;
export const COPIE_TAILLE_MAX = 10 * 1024 * 1024;

/** Sans copie après 7 jours, un rappel ; après 30 jours, le brouillon est retiré. */
export const JOURS_AVANT_RELANCE_DE_COPIE = 7;
export const JOURS_AVANT_ABANDON_DE_COPIE = 30;

/** Ce qu'il faut faire d'un mandat dont la copie tarde, au jour dit. Les jours se comptent depuis la signature, ou depuis le refus. */
export function suiteDeLaCopie(m: PourLEtape & Pick<MandatPrelevement, "relanceLe" | "state">, aujourdHui: string): "relancer" | "abandonner" | null {
  if (m.state === "revoque") return null;
  const etape = etapeDuMandat(m);
  if (etape !== "copie_attendue" && etape !== "copie_refusee") return null;
  const depuis = etape === "copie_refusee" ? (m.refusLe as string) : (m.signedAt as string);
  const jours = Math.floor((new Date(`${aujourdHui.slice(0, 10)}T12:00:00Z`).getTime() - new Date(`${depuis.slice(0, 10)}T12:00:00Z`).getTime()) / 86_400_000);
  if (jours >= JOURS_AVANT_ABANDON_DE_COPIE) return "abandonner";
  if (jours >= JOURS_AVANT_RELANCE_DE_COPIE && !m.relanceLe) return "relancer";
  return null;
}

/** Un mandat prélève-t-il encore ? Signé, actif, non révoqué, et sa copie vérifiée quand elle est requise. */
export const mandatVivant = (m: MandatPrelevement): boolean => m.state === "actif" && etapeDuMandat(m) === "actif";

/**
 * NI PLUS, NI MOINS : le montant présenté est CELUI du mandat.
 *
 * La règle était « au plus le plafond signé », ce qui autorisait tout montant
 * inférieur — c'est-à-dire la maison décidant du chiffre. Un prélèvement plus
 * petit que celui annoncé n'est pas une prudence : c'est une épargne qui se
 * remplit moins vite que ce que le client a lu, sans qu'il l'apprenne.
 */
export const tirageAutorise = (m: MandatPrelevement, montant: number): boolean => mandatVivant(m) && montant === m.amount;

/**
 * COMMENT UNE ÉPARGNE EST PAYÉE (11 novembre 2026, audit « signature du mandat d'une épargne »).
 *
 * Deux sources : le choix fait à la création (« reglement » de l'ordre permanent) et les mandats. Un mandat signé : « prélèvement ». Sinon, une épargne qui devait être prélevée, ou dont un mandat a été préparé, est « en attente du mandat » : rien ne sera prélevé tant qu'il n'est pas signé.
 * Le reste est un virement du client, sur appel de fonds.
 *
 * Une modification remplace l'ordre par une nouvelle version : un mandat qui paie la version d'avant couvre la suivante, d'où la lignée.
 */
export type PaiementDUneEpargne = "prelevement" | "mandat_a_signer" | "copie_attendue" | "en_verification" | "copie_refusee" | "virement";

export function paiementDeLEpargne(
  epargne: { id: string; reglement?: "virement" | "prelevement" },
  mandats: Pick<MandatPrelevement, "objet" | "standingId" | "state" | "signedAt" | "copieRequise" | "copieRecueLe" | "verifieLe" | "refusLe">[],
  toutes: { id: string; supersedes?: string }[] = [],
): PaiementDUneEpargne {
  const lignee = new Set<string>([epargne.id]);
  for (let cur = toutes.find((x) => x.id === epargne.id); cur?.supersedes && !lignee.has(cur.supersedes); cur = toutes.find((x) => x.id === cur?.supersedes)) lignee.add(cur.supersedes);
  const siens = mandats.filter((m) => m.objet === "instruction" && m.standingId && lignee.has(m.standingId) && m.state !== "revoque");
  if (siens.some((m) => m.state === "actif" && etapeDuMandat(m) === "actif")) return "prelevement";
  /* Signé par code mais pas encore prêt à prélever : l'étape de la copie se dit au client, et rien n'est prélevé. */
  const enCours = siens.map((m) => etapeDuMandat(m)).find((e) => e === "copie_attendue" || e === "en_verification" || e === "copie_refusee");
  if (enCours === "copie_attendue" || enCours === "en_verification" || enCours === "copie_refusee") return enCours;
  if (epargne.reglement === "prelevement" || siens.length) return "mandat_a_signer";
  return "virement";
}
