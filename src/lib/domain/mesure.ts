/**
 * LES MESURES SUR UN COMPTE : CE QU'ELLES EMPÊCHENT, ET CE QU'ELLES NE
 * TOUCHERONT JAMAIS.
 *
 * Une mesure est une décision de la maison contre un client, et c'est la
 * seule chose que la plateforme fasse dans ce sens-là. Trois règles
 * l'encadrent, et aucune n'est négociable.
 *
 * UNE MESURE NE RETIENT JAMAIS L'ARGENT NI LES TITRES DU CLIENT. Ils sont à
 * lui, pas à nous. Retirer ses espèces, vendre ce qu'il détient, racheter ses
 * parts, demander un relevé : rien de cela ne se bloque. Seule une décision
 * de justice ou une instruction de l'ANIF le permettrait, et c'est alors elle
 * qui est le fondement, pas notre appréciation.
 *
 * UNE MESURE NE COUPE JAMAIS LE CHEMIN VERS NOUS. Écrire au desk, déposer une
 * réclamation, corriger ses coordonnées, poser une clef d'accès : un compte
 * suspendu reste un compte dont on peut se plaindre.
 *
 * UNE MESURE A UNE FIN ÉCRITE D'AVANCE. Une durée par défaut, et elle tombe
 * d'elle-même à son terme : sinon un compte reste puni par oubli, ce qui est
 * la façon la plus sûre de perdre un client sans l'avoir décidé.
 */
import type { SensDeLIntention } from "./intent";

export const MESURES = ["aucune", "prepaiement", "fermeture_seule", "suspendu"] as const;
export type Mesure = (typeof MESURES)[number];

export const MESURE_LABEL: Record<Mesure, string> = {
  aucune: "Aucune mesure",
  prepaiement: "Prépaiement exigé",
  fermeture_seule: "Fermeture seule",
  suspendu: "Compte suspendu",
};

export const MESURE_QUOI: Record<Mesure, string> = {
  aucune: "le compte fonctionne normalement",
  prepaiement: "aucun ordre ferme sans provision disponible ; le reste normal",
  fermeture_seule: "rien qui augmente ses lignes ; il vend, rachète et sort ses espèces lui-même",
  suspendu: "aucun geste engageant ; lire, retirer son argent et nous écrire restent possibles",
};

/**
 * La teinte de la pastille, avec le cran plutôt que dans l'écran : un
 * barreau ajouté sans sa teinte retombait sur celle de « aucune mesure »,
 * c'est à dire en vert.
 */
export const MESURE_TON: Record<Mesure, string> = {
  aucune: "reglee",
  prepaiement: "recue",
  fermeture_seule: "transmise",
  suspendu: "annulee",
};

/**
 * L'ÉCHELLE, ET CE QUI SÉPARE SES TROIS BARREAUX.
 *
 * Le prépaiement dit « payez d'abord » : il ne retire rien, il déplace
 * l'ordre du paiement. La fermeture seule dit « plus rien de nouveau » : le
 * client garde la main sur ce qu'il détient déjà, choisit quoi vendre et
 * quand, et sort son argent tout seul. La suspension dit « nous n'agissons
 * plus de nous-mêmes sur votre compte » : sa sortie passe par une personne
 * du desk, ce qui est plus lourd pour lui et plus lourd pour nous, et c'est
 * pourquoi c'est le dernier barreau.
 *
 * LE CRAN DU MILIEU EST CELUI QU'ON VOULAIT. On ferme une relation sans
 * punir quelqu'un : il ne peut plus s'engager, et rien d'autre ne change.
 * Il manquait depuis le 10 octobre 2026, et son absence poussait à
 * suspendre des comptes qui ne méritaient que de ne plus grossir.
 */

/**
 * LES MOTIFS, PRIS DANS UNE LISTE FERMÉE.
 *
 * Un motif libre devient une phrase qu'on réécrit, et une mesure dont la
 * cause se réécrit n'est plus contestable. « auClient » est ce que le client
 * lit ; il est vide pour le soupçon, et ce vide est la loi, pas une pudeur.
 */
export const MOTIFS_DE_MESURE = {
  ordre_non_regle: { libelle: "Ordre servi non réglé", auClient: "Un ordre qui vous a été servi n'a pas été réglé.", conformite: false },
  appetits_sans_suite: { libelle: "Appétits répétés sans suite", auClient: "Plusieurs intentions annoncées n'ont pas été confirmées.", conformite: false },
  prelevements_rejetes: { libelle: "Prélèvements rejetés en série", auClient: "Plusieurs prélèvements ont été rejetés par votre banque.", conformite: false },
  coordonnees_fausses: { libelle: "Coordonnées fausses ou injoignables", auClient: "Nous ne parvenons plus à vous joindre sur les canaux déclarés.", conformite: false },
  demande_du_client: { libelle: "Demande du client", auClient: "À votre demande.", conformite: false },
  verification: { libelle: "Vérification de conformité", auClient: "", conformite: true },
} as const;
export type MotifDeMesure = keyof typeof MOTIFS_DE_MESURE;
export const estMotifDeMesure = (s: string | undefined): s is MotifDeMesure => Boolean(s && s in MOTIFS_DE_MESURE);

/** Quatre-vingt-dix jours, comme les courtiers qui exigent le prépaiement. */
export const JOURS_DE_MESURE = 90;

export interface MesurePosee {
  mesure: Mesure;
  motif?: MotifDeMesure;
  par?: string;
  le?: string;
  /** Le terme : au-delà, la mesure ne s'applique plus, sans que personne n'ait à la lever. */
  jusquAu?: string;
}

/**
 * Les gestes que les mesures commandent. Tout ce qui n'est pas nommé ici
 * reste ouvert : la liste dit ce qu'on EMPÊCHE, jamais ce qu'on autorise,
 * pour qu'un geste ajouté demain ne se trouve pas bloqué par surprise.
 */
export const GESTES_ENGAGEANTS = [
  "ordre.deposer",
  "ordre.signer",
  "ordre.accepter_contre",
  "epargne.creer",
  "epargne.modifier",
  "reinvestir",
  "mandat.creer",
  "mandat.signer",
] as const;
export type GesteEngageant = (typeof GESTES_ENGAGEANTS)[number];

/**
 * LE SENS PAR DÉFAUT DE CHAQUE GESTE, et pourquoi trois d'entre eux ne
 * peuvent pas en avoir un.
 *
 * Déposer, signer et accepter une contre-proposition passent par la même
 * porte qu'on achète ou qu'on vende : seul l'appelant connaît l'intention
 * qu'il porte, et il la dit. Tant qu'il ne la dit pas, on suppose qu'elle
 * augmente, parce qu'une supposition qui se trompe doit se tromper du côté
 * prudent. Les cinq autres n'ont qu'un sens : une épargne, un
 * réinvestissement et un mandat font toujours grossir la relation.
 *
 * Arrêter une épargne ou révoquer un mandat ne sont pas dans cette liste et
 * n'ont jamais de garde : cesser de s'engager se fait sous n'importe quelle
 * mesure, sinon la mesure aggraverait ce qu'elle veut arrêter.
 */
export const SENS_PAR_DEFAUT: Record<GesteEngageant, SensDeLIntention> = {
  "ordre.deposer": "augmente",
  "ordre.signer": "augmente",
  "ordre.accepter_contre": "augmente",
  "epargne.creer": "augmente",
  "epargne.modifier": "augmente",
  reinvestir: "augmente",
  "mandat.creer": "augmente",
  "mandat.signer": "augmente",
};

export interface Verdict {
  /** Vrai quand le geste passe. */
  ok: boolean;
  /** Ce que le client lit si le geste ne passe pas. */
  raison?: string;
}

const expiree = (m: MesurePosee, now: Date) => Boolean(m.jusquAu && m.jusquAu < now.toISOString().slice(0, 10));

/** La mesure qui s'applique vraiment : une mesure échue n'en est plus une. */
export const mesureVivante = (m: MesurePosee | undefined, now = new Date()): Mesure =>
  !m || m.mesure === "aucune" || expiree(m, now) ? "aucune" : m.mesure;

/**
 * LE GARDE, ET LE SEUL.
 *
 * Il répond pour un geste nommé, et sa phrase est celle que le client lira :
 * un refus sans raison est la pire des pannes muettes, parce que le client
 * croit avoir mal cliqué.
 *
 * `couvert` dit si la provision couvre déjà l'opération : sous prépaiement,
 * c'est la seule chose qui compte.
 */
export function peutAgir(
  geste: GesteEngageant,
  etat: { mesure?: MesurePosee; kycStatus?: string; couvert?: boolean; sens?: SensDeLIntention },
  now = new Date(),
): Verdict {
  const sens = etat.sens ?? SENS_PAR_DEFAUT[geste];
  /* CE QUI N'ENGAGE RIEN PASSE TOUJOURS. Poser une question et demander un
     rappel empruntent la même porte qu'un ordre : sans cette ligne, la
     suspension coupait le chemin vers le desk au moment précis où son propre
     message disait au client de nous écrire. */
  if (sens === "aucun") return { ok: true };

  if (etat.kycStatus === "clos") {
    return { ok: false, raison: "Votre compte est clos. Écrivez-nous si vous souhaitez en ouvrir un nouveau." };
  }
  /* UNE CLÔTURE SE SOLDE, DONC ELLE LAISSE VENDRE. Refuser aussi les
     cessions enfermait le client dans un compte qu'il avait demandé à
     fermer : il ne pouvait plus en sortir ce qui s'y trouvait. */
  if (etat.kycStatus === "en_cloture" && sens === "augmente") {
    return { ok: false, raison: "Votre compte est en cours de clôture : aucun nouvel engagement n'est possible, mais vous pouvez solder vos lignes. Écrivez-nous si ce n'est pas votre demande." };
  }

  const m = mesureVivante(etat.mesure, now);
  if (m === "suspendu") {
    return { ok: false, raison: "Votre compte est suspendu : vous pouvez consulter vos lignes, demander vos espèces et nous écrire. Pour vendre une ligne, écrivez-nous : un conseiller la passe avec vous." };
  }
  /* LA FERMETURE SEULE NE REGARDE QUE LE SENS. Elle laisse tout ce qui
     réduit, et refuse tout ce qui augmente : c'est sa définition entière. */
  if (m === "fermeture_seule" && sens === "augmente") {
    return { ok: false, raison: "Votre compte n'accepte plus de nouvel engagement : vous pouvez vendre vos lignes, racheter vos parts, retirer vos espèces et nous écrire." };
  }
  if (m === "prepaiement" && sens === "augmente" && !etat.couvert && (geste === "ordre.deposer" || geste === "ordre.signer" || geste === "ordre.accepter_contre")) {
    return { ok: false, raison: "Votre compte exige le prépaiement : approvisionnez votre provision du montant de l'ordre, puis reprenez. Le reste de votre espace fonctionne normalement." };
  }
  return { ok: true };
}

/** Ce que le client lit de sa propre mesure, sur son écran : jamais le motif d'un soupçon. */
export function diteAuClient(m: MesurePosee | undefined, now = new Date()): string | undefined {
  const vivante = mesureVivante(m, now);
  if (vivante === "aucune" || !m) return undefined;
  const motif = m.motif ? MOTIFS_DE_MESURE[m.motif] : undefined;
  /* LE SILENCE DU SOUPÇON N'EST PAS UNE PUDEUR, C'EST LA LOI. Prévenir
     quelqu'un qu'il est soupçonné est une faute au regard des textes LBC/FT,
     et cela prévient précisément la personne qu'il ne faut pas prévenir. */
  const cause = motif?.conformite || !motif?.auClient ? "Une vérification est en cours sur votre compte, et nous revenons vers vous." : motif.auClient;
  const fin = m.jusquAu ? ` Jusqu'au ${m.jusquAu}.` : "";
  return `${MESURE_LABEL[vivante]}. ${cause}${fin}`;
}
