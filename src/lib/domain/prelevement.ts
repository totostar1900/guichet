import { MOIS_REFUSES_AVANT_ARRET, type MandatPrelevement } from "./mandat";
import type { StandingOrder } from "./standing";

/**
 * L'EXÉCUTION D'UN MANDAT : l'échéance, le fichier, et le sort de chaque ligne.
 *
 * Le mandat est l'autorisation ; ce module est ce qu'on en fait. Et ce qu'on en
 * fait est d'une autre nature que tout le reste de la maison, pour une raison
 * qui tient en une phrase : UN VIREMENT QUI N'ARRIVE PAS EST UN NON-ÉVÉNEMENT,
 * UN PRÉLÈVEMENT QUI ÉCHOUE EST UN REJET. Il coûte au client, il s'inscrit chez
 * sa banque, et répété il fait casser le mandat. Tout ce fichier est écrit
 * autour de ce fait.
 *
 * QUATRE RÈGLES, et chacune ferme une panne précise.
 *
 *   1. RIEN NE PART SANS PRÉAVIS PARTI. C'est déjà la loi des instructions
 *      permanentes (`preavis.ts`), et elle vaut davantage ici : un versement
 *      qu'on n'a pas annoncé ne fait que ne pas avoir lieu, un prélèvement
 *      qu'on n'a pas annoncé est un débit que le client découvre sur son
 *      relevé.
 *
 *   2. LE MONTANT PRÉSENTÉ EST CELUI DU MANDAT, ni plus ni moins. La règle
 *      était « au plus le plafond signé », ce qui autorisait aussi tout
 *      montant inférieur, c'est-à-dire la maison décidant du chiffre. Le
 *      plafond est parti le 25 octobre 2026 : il n'y a qu'un nombre, et c'est
 *      celui que le client a écrit.
 *
 *   3. UNE SEULE PRÉSENTATION PAR MOIS, ET UN MOIS REFUSÉ EST SAUTÉ. La maison
 *      représentait un rejet pour provision insuffisante quinze jours plus
 *      tard. C'est une seconde chance à l'intention du client, et une seconde
 *      ponction d'incident à ses frais s'il n'a toujours rien : il paie deux
 *      fois pour le même mois. Un mois refusé est donc perdu, et le mandat
 *      reprend à l'échéance suivante.
 *
 *   4. UN TIRAGE REMIS A TROIS ISSUES, et la troisième est l'absence des deux
 *      autres. « Sans nouvelle » se CALCULE et ne se range pas : un état rangé
 *      le jour de la remise mentirait le lendemain.
 *
 *   5. LA CAUSE D'UN REJET DÉCIDE DE LA SUITE, PAS LE COMPTE. Une provision
 *      insuffisante laisse le mandat en vie pour le mois suivant ; un compte
 *      clos l'arrête sur-le-champ. Compter les rejets sans lire leur cause
 *      ferait présenter sur un compte qui n'existe plus, c'est-à-dire harceler
 *      la banque d'un client pour une faute qui est la nôtre.
 *
 *   6. CHAQUE ISSUE SE DIT AU CLIENT, et pas seulement les mauvaises. Un
 *      prélèvement encaissé était muet : l'argent entrait, la page le montrait
 *      à qui venait voir, et personne ne disait rien. La promesse « vous êtes
 *      prévenu à chaque fois » ne se tient pas à moitié.
 */

/** Ce qu'un tirage est devenu. « Sans nouvelle » n'y est pas : il se calcule. */
export type EtatDuTirage =
  | "prepare" // l'échéance est constituée, rien n'est parti
  | "remis" // le fichier est chez la banque, le sort est inconnu
  | "encaisse" // l'argent est au journal du client
  | "rejete" // la banque a dit non, avec une cause
  | "abandonne"; // écarté avant la remise : mandat révoqué, instruction arrêtée

/**
 * Pourquoi une banque refuse, et c'est la seule chose qui décide de la suite.
 *
 * La liste est volontairement courte. Les codes de rejet varient d'une banque
 * à l'autre dans la zone, et une liste exhaustive serait une liste fausse :
 * ce qui compte n'est pas le code de la banque, c'est ce que la maison en
 * fait, et il n'y a que deux suites possibles.
 */
export type MotifDeRejet = "provision_insuffisante" | "compte_clos" | "opposition" | "coordonnees_erronees" | "mandat_inconnu" | "autre";

export interface Motif {
  libelle: string;
  /**
   * Le mandat garde-t-il un sens au mois suivant ?
   *
   * C'était « rejouable », c'est-à-dire « peut-on représenter ce mois-ci » :
   * on ne représente plus rien dans le mois, le mois est sauté. La question
   * devenue utile est celle de la SUITE — une provision insuffisante est
   * passagère, un compte clos ne le sera jamais.
   */
  reprendLeMoisSuivant: boolean;
  /** Ce que le client lit, et qui dit la suite plutôt que la panne. */
  auClient: string;
}

export const MOTIFS: Record<MotifDeRejet, Motif> = {
  provision_insuffisante: {
    libelle: "Provision insuffisante",
    reprendLeMoisSuivant: true,
    auClient: "Votre banque n'a pas pu honorer le prélèvement. Nous ne le représentons pas ce mois-ci : ce mois est sauté, et la prochaine échéance est la suivante.",
  },
  compte_clos: {
    libelle: "Compte clos",
    reprendLeMoisSuivant: false,
    auClient: "Le compte à débiter est clos. Votre prélèvement est arrêté : indiquez-nous le nouveau compte et nous le reprenons.",
  },
  opposition: {
    libelle: "Opposition du client",
    reprendLeMoisSuivant: false,
    auClient: "Votre banque nous signale une opposition sur ce prélèvement. Nous ne présentons plus rien, et votre conseiller vous appelle.",
  },
  coordonnees_erronees: {
    libelle: "Coordonnées bancaires erronées",
    reprendLeMoisSuivant: false,
    auClient: "Le prélèvement n'a pas abouti : les coordonnées du compte ne correspondent pas. Il est arrêté, et nous le reprenons avec vous.",
  },
  mandat_inconnu: {
    libelle: "Mandat inconnu de la banque",
    reprendLeMoisSuivant: false,
    auClient: "Votre banque ne reconnaît pas ce mandat. Votre prélèvement est arrêté ; votre conseiller vous appelle pour le régulariser.",
  },
  autre: {
    libelle: "Autre motif",
    reprendLeMoisSuivant: false,
    auClient: "Le prélèvement n'a pas abouti. Il est arrêté le temps que nous comprenions pourquoi.",
  },
};

/**
 * CINQ JOURS DE PRÉAVIS, et non un comme pour un versement programmé.
 *
 * Un versement programmé déplace de l'argent déjà chez nous : un jour suffit à
 * dire non. Un prélèvement demande au client d'AVOIR les fonds sur son compte
 * au jour dit, et cela ne se fait pas en une nuit. Cinq jours est le délai qui
 * laisse le temps d'approvisionner ou de refuser ; au-delà, l'annonce est trop
 * loin du débit pour qu'on s'en souvienne.
 */
export const PREAVIS_JOURS = 5;

/**
 * Dix jours sans nouvelle d'un tirage remis, et c'est la banque qu'on appelle.
 *
 * Le délai d'un prélèvement de place est de quelques jours. Au-delà de dix,
 * l'absence de réponse n'est plus un délai, c'est un silence : l'argent a pu
 * être débité chez le client sans nous parvenir, ou n'avoir jamais été
 * présenté, et les deux se ressemblent de notre côté.
 */
export const JOURS_SANS_NOUVELLE = 10;

/**
 * Le décalage entre le tirage et le versement qu'il alimente.
 *
 * Un mandat d'épargne programmée doit amener l'argent AVANT que l'instruction
 * ne l'investisse, sans quoi le jour dit le solde est vide et on a fait un
 * prélèvement pour rien. Cinq jours d'avance, bornés à partir du 1er : une
 * instruction du 3 se prélève le 1er, ce qui est tôt de deux jours et jamais
 * trop tard.
 */
export const AVANCE_SUR_LE_VERSEMENT = 5;

export interface Tirage {
  id: string;
  /** La référence citée dans le fichier remis à la banque et dans toute contestation. */
  ref: string;
  remiseId?: string;
  mandatId: string;
  userId: string;
  /** Le jour où le prélèvement est présenté. */
  dueOn: string;
  amount: number;
  state: EtatDuTirage;
  announcedAt?: string;
  /** Le préavis est-il parti ? Faux interdit la remise, à dessein. */
  noticeSent: boolean;
  noticeError?: string;
  handedAt?: string;
  /** Le jour du sort : encaissement ou rejet. */
  settledAt?: string;
  rejectCode?: MotifDeRejet;
  rejectNote?: string;
  /** Le mouvement créé au journal du client, à l'encaissement. */
  cashEntry?: string;
  createdAt: string;
}

export type NewTirage = Pick<Tirage, "mandatId" | "userId" | "dueOn" | "amount">;

export interface RemiseDePrelevement {
  id: string;
  /** « RP-2610-15 » : le mois et le jour de l'échéance, cités par la banque. */
  ref: string;
  dueOn: string;
  state: "preparee" | "remise";
  createdAt: string;
  createdBy?: string;
  handedAt?: string;
  handedBy?: string;
}

const jour = (iso: string) => iso.slice(0, 10);
const jourPlus = (iso: string, n: number): string => new Date(new Date(`${jour(iso)}T12:00:00.000Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const joursEntre = (a: string, b: string): number => Math.floor((new Date(`${jour(b)}T00:00:00Z`).getTime() - new Date(`${jour(a)}T00:00:00Z`).getTime()) / 86_400_000);

/**
 * Le jour du mois où un mandat se présente.
 *
 * Pour la provision, c'est le jour que le client a signé. Pour une épargne
 * programmée, c'est celui de l'instruction, avancé pour que l'argent soit là
 * quand elle s'exécute : voir `AVANCE_SUR_LE_VERSEMENT`.
 */
export function jourDeTirage(m: MandatPrelevement, s?: Pick<StandingOrder, "dayOfMonth">): number | undefined {
  if (m.objet === "provision") return m.dayOfMonth;
  if (!s?.dayOfMonth) return undefined;
  return Math.max(1, s.dayOfMonth - AVANCE_SUR_LE_VERSEMENT);
}

/**
 * CE QU'UN MANDAT PRÉLÈVE : SON MONTANT, et celui-là seul.
 *
 * Un mandat d'épargne programmée prenait le montant de l'instruction, qui peut
 * changer sans que le mandat soit resigné : la banque voyait alors un chiffre
 * que le client n'avait jamais écrit sur cette autorisation. Depuis le
 * 25 octobre 2026, le mandat porte son propre nombre, signé, et c'est lui
 * qu'on présente. L'écart avec l'instruction, s'il existe, se DIT au desk —
 * voir « echeanceDuJour » — au lieu de changer le montant en silence.
 */
export function montantDuTirage(m: MandatPrelevement): number {
  return m.amount;
}

export interface Ecarte {
  mandat: MandatPrelevement;
  /** Ce que le desk doit faire, pas seulement ce qui cloche. */
  raison: string;
  montant?: number;
}

/**
 * UNE LIGNE QUI SE PRÉSENTE, et ce qu'il faut savoir en la présentant.
 *
 * La « note » ne retient rien : elle se lit à côté du montant. C'est la place
 * d'un écart qu'il faut voir sans qu'il empêche le prélèvement — le seul cas
 * connu est le mandat d'épargne programmée dont l'instruction a changé de
 * montant depuis la signature. Écarter la ligne priverait le client de son
 * épargne du mois pour une différence qu'il n'a peut-être pas voulue ; la
 * taire laisserait l'instruction échouer faute de fonds, un mois plus tard,
 * sans que personne ait vu venir.
 */
export interface ATirer {
  mandat: MandatPrelevement;
  amount: number;
  note?: string;
}

/**
 * L'ÉCHÉANCE D'UN JOUR : ce qui se prélève, et ce qui est écarté avec sa raison.
 *
 * Les écartés sortent AVEC la liste, et non d'une requête qu'il faudrait
 * penser à faire. Un mandat qui ne tire pas est silencieux par nature : le
 * client croit son épargne alimentée, le desk voit une liste plus courte sans
 * savoir qu'elle l'est, et le mois passe. C'est la panne muette de ce lot.
 */
export function echeanceDuJour(mandats: MandatPrelevement[], standings: StandingOrder[], dueOn: string): { aTirer: ATirer[]; ecartes: Ecarte[] } {
  const parId = new Map(standings.map((s) => [s.id, s]));
  const d = Number(jour(dueOn).slice(8, 10));
  const aTirer: ATirer[] = [];
  const ecartes: Ecarte[] = [];

  for (const m of mandats) {
    if (!m.signedAt) continue;
    const s = m.standingId ? parId.get(m.standingId) : undefined;
    if (jourDeTirage(m, s) !== d) continue;

    if (m.state === "revoque") {
      /* Un mandat révoqué juste avant son échéance se dit une fois : sinon le
         desk cherche pourquoi la liste a maigri. Passé un mois, il se tait. */
      if (m.revokedAt && joursEntre(m.revokedAt, dueOn) <= 31) ecartes.push({ mandat: m, raison: "Révoqué par le client avant l'échéance." });
      continue;
    }
    if (m.state === "suspendu") {
      ecartes.push({ mandat: m, raison: `Arrêté après ${m.rejects ?? MOIS_REFUSES_AVANT_ARRET} mois refusés de suite. Il se reprend à la main, après un mot au client.` });
      continue;
    }
    if (m.objet === "instruction" && (!s || s.state !== "active")) {
      ecartes.push({ mandat: m, raison: "L'instruction permanente qu'il alimente n'est plus active." });
      continue;
    }
    const montant = montantDuTirage(m);
    if (!montant || montant <= 0) {
      ecartes.push({ mandat: m, raison: "Aucun montant à prélever." });
      continue;
    }
    /* L'ÉCART AVEC L'INSTRUCTION SE DIT, ET NE RETIENT RIEN. Le mandat présente
       ce que le client a signé ; si l'instruction a changé de montant depuis,
       le desk doit le voir — mais sauter le mois priverait le client de son
       épargne pour un écart qu'il n'a peut-être pas voulu. */
    const ecart = s && s.amount !== montant ? `L'instruction qu'il alimente porte ${s.amount} FCFA : le mandat signé en présente ${montant}. Appelez le client s'il faut le resigner.` : undefined;
    aTirer.push({ mandat: m, amount: montant, note: ecart });
  }
  return { aTirer, ecartes };
}

/** Le jour où le préavis d'une échéance doit partir. */
export const jourDuPreavis = (dueOn: string): string => jourPlus(dueOn, -PREAVIS_JOURS);

/**
 * LA PROCHAINE DATE OÙ CE MANDAT SE PRÉSENTERA, DITE AU CLIENT.
 *
 * Le desk raisonne par journée : « quelles échéances tombent aujourd'hui ».
 * Le client, lui, demande l'inverse, « et la mienne, c'est quand », et cette
 * question n'avait pas de réponse dans le code. Elle se calcule ici, à un
 * seul endroit, parce que deux calculs de date finissent toujours par rendre
 * deux dates.
 *
 * Le jour va de 1 à 28 (voir JOUR_MIN/JOUR_MAX) : tous les mois les ont, donc
 * aucune décision de février à prendre. Le jour même compte encore comme une
 * échéance à venir tant qu'elle n'est pas remise : le préavis, lui, est déjà
 * parti cinq jours plus tôt.
 */
export function prochaineEcheance(jourDuMois: number, aujourdHui: string): string {
  const [an, mois] = [Number(aujourdHui.slice(0, 4)), Number(aujourdHui.slice(5, 7))];
  const pose = (a: number, m: number) => `${a}-${String(m).padStart(2, "0")}-${String(jourDuMois).padStart(2, "0")}`;
  const ceMois = pose(an, mois);
  if (ceMois >= jour(aujourdHui)) return ceMois;
  return mois === 12 ? pose(an + 1, 1) : pose(an, mois + 1);
}

export type RefusDeRemise = "pas_annonce" | "pas_parti" | "trop_tot" | "deja_remis" | "abandonne";

/**
 * Pourquoi ce tirage ne part pas dans la remise, ou rien.
 *
 * `pas_parti` est la règle 1, et elle laisse le tirage en vie sans le remettre.
 * Le risque est qu'un client au canal cassé ne soit pas prélevé ; il est assumé,
 * et il est l'exact inverse du risque qu'on refuse : débiter quelqu'un sans
 * l'avoir prévenu.
 */
export function pourquoiPasRemettre(t: Pick<Tirage, "state" | "announcedAt" | "noticeSent" | "dueOn">, aujourdHui: string): RefusDeRemise | null {
  if (t.state === "abandonne") return "abandonne";
  if (t.state !== "prepare") return "deja_remis";
  if (!t.announcedAt) return "pas_annonce";
  if (!t.noticeSent) return "pas_parti";
  if (jour(t.dueOn) > jour(aujourdHui)) return "trop_tot";
  return null;
}

/**
 * Un tirage remis dont on n'a toujours aucune nouvelle.
 *
 * CALCULÉ, JAMAIS RANGÉ : l'état « sans nouvelle » dépend du jour où on
 * regarde. Rangé le jour de la remise, il serait faux le lendemain, et rangé
 * par un robot il dépendrait de son passage.
 */
export const sansNouvelle = (t: Pick<Tirage, "state" | "handedAt">, now = new Date()): boolean =>
  t.state === "remis" && Boolean(t.handedAt) && joursEntre(t.handedAt!, now.toISOString()) > JOURS_SANS_NOUVELLE;

/** L'âge d'un tirage remis, en jours : c'est lui qui range la file. */
export const ageDeLaRemise = (t: Pick<Tirage, "handedAt">, now = new Date()): number => (t.handedAt ? Math.max(0, joursEntre(t.handedAt, now.toISOString())) : 0);

/**
 * Ce qu'un rejet laisse derrière lui : un mois sauté, ou un prélèvement arrêté.
 *
 * Il n'y a plus de troisième issue. « Représenter » en était une, quinze jours
 * plus tard, et elle est partie le 25 octobre 2026 : une seconde présentation
 * dans le même mois est une seconde ponction d'incident à la charge du client
 * s'il n'a toujours rien. Un mois refusé est perdu.
 */
export type SuiteDuRejet = { suite: "passe"; pourquoi: string; prochaine: string } | { suite: "arrete"; pourquoi: string };

/**
 * CE QU'ON FAIT D'UN REJET, et c'est d'abord sa cause qui le dit.
 *
 * Une provision insuffisante est passagère : le mois est sauté, et le mandat
 * reprend à l'échéance suivante. Toutes les autres causes décrivent un compte
 * ou un mandat que le mois prochain ne réparera pas — y revenir serait
 * harceler la banque d'un client pour une faute qui n'est pas la sienne.
 *
 * Et DEUX MOIS REFUSÉS DE SUITE ARRÊTENT, quelle que soit la cause du second :
 * le compteur du mandat ne compte que des mois consécutifs, puisqu'il repart
 * de zéro au premier encaissement.
 */
export function suiteDuRejet(motif: MotifDeRejet, moisRefusesDeSuite: number, dueOn: string, jourDuMois?: number): SuiteDuRejet {
  if (!MOTIFS[motif].reprendLeMoisSuivant) {
    return { suite: "arrete", pourquoi: `${MOTIFS[motif].libelle} : le mois prochain n'y changerait rien, et insister fait casser le mandat par la banque du client.` };
  }
  if (moisRefusesDeSuite >= MOIS_REFUSES_AVANT_ARRET) {
    return { suite: "arrete", pourquoi: `${MOIS_REFUSES_AVANT_ARRET} mois refusés de suite pour provision insuffisante : la maison s'arrête d'elle-même plutôt que de s'acharner.` };
  }
  return {
    suite: "passe",
    pourquoi: "Provision insuffisante : ce mois est sauté, et rien n'est représenté avant l'échéance suivante.",
    prochaine: prochaineEcheance(jourDuMois ?? Number(jour(dueOn).slice(8, 10)), jourPlus(dueOn, 1)),
  };
}

/** La référence d'une remise : le mois et le jour de l'échéance, que la banque cite. */
export const refDeLaRemise = (dueOn: string): string => `RP-${jour(dueOn).slice(2, 4)}${jour(dueOn).slice(5, 7)}-${jour(dueOn).slice(8, 10)}`;

/**
 * LE FICHIER REMIS À LA BANQUE.
 *
 * Pas de norme dans la zone : il n'existe pas de pain.008 que les banques
 * CEMAC liraient, et prétendre le contraire produirait un fichier élégant que
 * personne n'accepterait. Ce fichier dit donc simplement ce qu'une remise doit
 * dire, dans l'ordre où un guichet le lit, et le format exact reste à convenir
 * avec la banque : c'est l'en-tête qui changera, pas les colonnes.
 *
 * Point-virgule et BOM, parce que ce fichier s'ouvre dans l'Excel d'une banque
 * francophone avant d'être lu par quoi que ce soit d'autre, et qu'une virgule
 * y collerait toutes les colonnes en une.
 */
export interface LigneDeRemise {
  ref: string;
  mandatRef: string;
  dueOn: string;
  titulaire: string;
  banque: string;
  compte: string;
  amount: number;
  libelle: string;
}

export function csvDeLaRemise(remiseRef: string, lignes: LigneDeRemise[]): string {
  const echappe = (v: string | number) => {
    const s = String(v).replace(/"/g, '""');
    return /[";\r\n]/.test(s) ? `"${s}"` : s;
  };
  const head = ["Remise", "Reference du prelevement", "Reference du mandat", "Date d echeance", "Titulaire du compte", "Banque", "RIB ou IBAN", "Montant FCFA", "Libelle"];
  const corps = lignes.map((l) => [remiseRef, l.ref, l.mandatRef, l.dueOn, l.titulaire, l.banque, l.compte, Math.round(l.amount), l.libelle]);
  const total = ["", "", "", "", "", "", "TOTAL", lignes.reduce((s, l) => s + Math.round(l.amount), 0), `${lignes.length} prelevement(s)`];
  return `﻿${[head, ...corps, total].map((r) => r.map(echappe).join(";")).join("\r\n")}\r\n`;
}
