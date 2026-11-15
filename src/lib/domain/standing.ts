import type { Part } from "./repartition";
import type { Offer } from "./types";

/**
 * L'instruction permanente : un versement mensuel, décidé une fois.
 *
 * Purpose Capital est société de bourse et n'a pas l'agrément de gestion. Un
 * versement mensuel ne peut donc être ni un pot commun, ni un arbitrage que la
 * maison déciderait chaque mois : c'est un ordre que le client donne une fois,
 * et que la maison exécute sans jamais rien choisir.
 *
 * Toute la conception tient dans un seul test, et il vaut la peine de l'écrire
 * en toutes lettres parce qu'il décide de ce qui a le droit d'entrer ici : un
 * tiers doit pouvoir lire l'instruction et calculer ce qui partira le mois
 * prochain sans demander son avis au desk. « 50 000 le 5, dans ce fonds, jusqu'à
 * nouvel ordre » passe le test. « 50 000 dans le fonds monétaire le mieux placé »
 * ne le passe pas, et ce n'est pas une question de code : c'est de la gestion,
 * et la maison n'a pas cet agrément.
 *
 * Trois conséquences, qui expliquent des choix qui pourraient sembler rigides.
 *
 * La destination est une ligne, jamais une catégorie. Elle est fixée à la
 * signature.
 *
 * Le jour va de 1 à 30 (décision du 15 novembre 2026). Le 29 et le 30 n'existent
 * pas en février : la règle est écrite d'avance, ici, et elle ne se décide pas
 * un mois donné. Quand le jour n'existe pas dans le mois, le versement tombe le
 * 1er du mois suivant (« dateDuVersement »). Le 31 reste refusé.
 *
 * Ce qu'on fait quand l'exécution est impossible se décide à la signature, par
 * le client, et pas au moment où ça bloque. Un fonds suspendu, un minimum
 * relevé : on passe ce versement, ou l'on arrête. Improviser reviendrait à
 * décider à sa place.
 */

/**
 * Au-delà de combien de jours ouvrés un versement programmé non réglé cesse
 * d'être « un virement en route ».
 *
 * Cinq : le délai d'un virement de place dans la zone, plus un jour. En deçà,
 * relancer un client qui a déjà viré serait du bruit ; au-delà, personne ne
 * regardait, et le robot en ajoutait un chaque mois.
 */
export const JOURS_AVANT_RELANCE = 5;

export type StandingState = "active" | "suspendue" | "terminee" | "annulee" | "remplacee";
export type OnBlocked = "passer" | "arreter";

/**
 * D'où vient l'argent du versement, et par quoi il se déclenche.
 *
 * VIREMENT : ce qui existait. Le client vire, le jour du mois décide, et le
 * montant est fixé à la signature.
 *
 * ENCAISSEMENTS : le réinvestissement des coupons. C'est un encaissement
 * réellement porté au journal qui déclenche, jamais le calendrier, et le
 * montant est ce qui est arrivé, jamais une somme choisie d'avance. Placer un
 * montant fixe engagerait un argent que la maison n'a pas reçu ; attendre un
 * jour du mois laisserait le coupon dormir, ce que la politique des espèces
 * interdit précisément.
 *
 * Les deux partagent tout le reste, et c'est pourquoi ils partagent une table :
 * une destination fixée à la signature, un état, et ce qu'on fait quand
 * l'exécution est impossible, décidé par le client d'avance. Leur donner deux
 * machines aurait fait diverger deux choses qui doivent se comporter pareil.
 */
export type StandingSource = "virement" | "encaissements";

/** Comment une épargne programmée est payée. */
export type ReglementDeLEpargne = "virement" | "prelevement";

export interface StandingOrder {
  id: string;
  ref: string;
  userId: string;
  clientName: string;
  clientSegment: string;
  /** La destination, fixée à la signature. */
  offerId: string;
  /** Le montant d'un versement par virement. Zéro pour un réinvestissement : c'est l'encaissement qui décide. */
  amount: number;
  /** D'où vient l'argent, et par quoi le versement se déclenche. */
  source: StandingSource;
  /** En deçà, on ne place rien et on attend : un ordre dérisoire coûte plus qu'il ne rapporte. */
  minAmount: number;
  /** Comment l'épargne est payée, choisi à la création : un virement sur appel de fonds, ou un prélèvement sous mandat signé. Absent : virement (migration 0128). */
  reglement?: ReglementDeLEpargne;
  /** 1 à 30 (le 29 et le 30 tombent le 1er mars quand février ne les a pas). Sans objet pour un réinvestissement, que l'encaissement déclenche. */
  dayOfMonth: number;
  startsOn: string;
  endsOn?: string;
  state: StandingState;
  onBlocked: OnBlocked;
  channel: "WhatsApp" | "Appel" | "E-mail";
  contactPhone?: string;
  contactEmail?: string;
  /**
   * La clé de répartition écrite par le client, quand il en a écrit une.
   *
   * Absente, la destination unique de « offerId » reçoit tout : ce n'est pas un
   * cas particulier mais une clé à une part, et le robot ne connaît que des
   * clés. Voir « domain/repartition.ts ».
   */
  splits?: Part[];
  /**
   * L'instruction que celle-ci remplace.
   *
   * Une instruction qui a produit des ordres ne se réécrit pas : ces ordres la
   * désignent par son identifiant, et la modifier ferait mentir le passé. Une
   * modification est donc un remplacement, et la chaîne est l'histoire des
   * versions.
   */
  supersedes?: string;
  /** Le dernier versement produit : un seul par mois civil. */
  lastRunOn?: string;
  stopReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewStandingOrder {
  userId: string;
  clientName: string;
  clientSegment: string;
  offerId: string;
  amount: number;
  source?: StandingSource;
  minAmount?: number;
  reglement?: ReglementDeLEpargne;
  dayOfMonth: number;
  startsOn: string;
  endsOn?: string;
  onBlocked: OnBlocked;
  channel: "WhatsApp" | "Appel" | "E-mail";
  contactPhone?: string;
  contactEmail?: string;
  /** La clé de répartition, quand le client en a écrit une. */
  splits?: Part[];
  /** L'instruction remplacée, quand celle-ci est une nouvelle version. */
  supersedes?: string;
}

export const STANDING_STATE_LABEL: Record<StandingState, string> = {
  active: "Active",
  suspendue: "Suspendue",
  terminee: "Terminée",
  annulee: "Arrêtée",
  /* « Remplacée » n'est ni « arrêtée » ni « terminée » : elle a cessé parce que
     le client a changé ses termes, et confondre les trois perdrait la raison. */
  remplacee: "Remplacée",
};

const day = (iso: string) => iso.slice(0, 10);
const month = (iso: string) => iso.slice(0, 7);

/** Le dernier jour qu'on peut choisir pour un versement mensuel. */
export const JOUR_MAX_VERSEMENT = 30;
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * LA DATE D'UN VERSEMENT DANS UN MOIS, ET LA RÈGLE DE FÉVRIER (décision du 15 novembre 2026).
 *
 * Le jour choisi existe presque toujours. Quand il n'existe pas (le 29 en février d'une année ordinaire, le 30 en février), le versement tombe le 1er du mois
 * suivant : le 1er mars. Écrit une fois, ici, pour que le formulaire, la liste, le robot et le préavis disent la même date.
 */
export function dateDuVersement(annee: number, mois: number, jour: number): string {
  const dernier = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  if (jour <= dernier) return `${annee}-${pad2(mois)}-${pad2(jour)}`;
  return mois === 12 ? `${annee + 1}-01-01` : `${annee}-${pad2(mois + 1)}-01`;
}

/** Les dates où un versement tombe autour d'un jour : le mois d'avant (un débordement atterrit le 1er), le mois même et les deux suivants. */
function datesAutour(jour: number, d: string): string[] {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  const out: string[] = [];
  for (let k = -1; k <= 2; k++) {
    const mm = m + k;
    const yy = y + Math.floor((mm - 1) / 12);
    out.push(dateDuVersement(yy, ((mm - 1 + 12) % 12) + 1, jour));
  }
  return out.sort();
}

/**
 * Le minimum qui s'applique à un versement récurrent.
 *
 * Le minimum d'une convention porte d'ordinaire sur la première souscription.
 * Un versement qui vient s'ajouter à une position déjà ouverte se négocie plus
 * bas, et c'est la clause qui décide si une épargne programmée est à la portée
 * d'un salarié ou réservée à qui met déjà cent mille francs par mois. Tant que
 * le desk ne l'a pas renseignée, on applique la seule qu'on connaisse.
 */
export function recurringMinimum(o: Offer): number {
  return o.fund?.minRecurring ?? o.fund?.minAmount ?? 0;
}

/**
 * Ce qui empêche cette instruction, en toutes lettres, ou rien.
 *
 * Un réinvestissement ne se juge pas sur le même montant : le sien n'est connu
 * qu'au moment où le coupon tombe. Ce qui se vérifie à la signature est la
 * destination et le calendrier ; le montant se vérifie à l'exécution, contre ce
 * qui est réellement arrivé.
 */
export function standingBlock(o: Offer | undefined, i: { amount: number; dayOfMonth: number; startsOn: string; endsOn?: string; source?: StandingSource }): string[] {
  const out: string[] = [];
  const surEncaissements = i.source === "encaissements";
  if (!o) {
    out.push("La destination est introuvable.");
    return out;
  }
  // Un versement mensuel va vers une part de fonds, qui se divise. Un titre ne se
  // divise pas : un montant fixe n'y tombe jamais juste, et le reste devrait
  // attendre quelque part, ce qui est une autre question que celle-ci.
  if (o.kind !== "FONDS") out.push("Un versement programmé va vers un fonds.");
  else if (!o.fund?.distributed || o.hidden || o.status === "withdrawn") out.push("Ce fonds n'est pas ouvert à la souscription.");
  else {
    const min = recurringMinimum(o);
    // La phrase garde son trou pour le dictionnaire : les clefs a placeholder se
    // reconnaissent sur le texte deja interpole et rendent la phrase anglaise.
    if (!surEncaissements && min > 0 && i.amount < min) out.push(`Le versement minimum sur ce fonds est de ${min.toLocaleString("fr-FR")} FCFA.`);
  }
  if (!surEncaissements && !(i.amount > 0)) out.push("Le montant du versement manque.");
  if (!surEncaissements && (!Number.isInteger(i.dayOfMonth) || i.dayOfMonth < 1 || i.dayOfMonth > JOUR_MAX_VERSEMENT))
    out.push(`Le jour du versement va du 1 au ${JOUR_MAX_VERSEMENT}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.startsOn)) out.push("La date de départ manque.");
  if (i.endsOn && i.endsOn < i.startsOn) out.push("La fin ne peut pas précéder le départ.");
  return out;
}

/**
 * Ce versement est-il dû aujourd'hui ?
 *
 * « Dû » ne veut pas dire « c'est exactement le 5 ». Le client a demandé un
 * versement par mois, pas un versement à la seconde près : si le robot a manqué
 * son jour, il rattrape le lendemain. Ce qu'il ne fait jamais, c'est deux
 * versements dans le même mois civil, et c'est « lastRunOn » qui le garantit.
 */
export function isDue(s: StandingOrder, today: string): boolean {
  if (s.state !== "active") return false;
  const d = day(today);
  if (d < day(s.startsOn)) return false;
  if (s.endsOn && d > day(s.endsOn)) return false;
  /* LA DERNIÈRE DATE PRÉVUE DANS LE MOIS EN COURS : celle du mois lui-même, ou un débordement de février tombé le 1er. Le rattrapage reste dans le mois civil,
     et un versement du 30 mars n'est pas empêché par celui du 1er mars qui rattrapait février. */
  const prevue = datesAutour(s.dayOfMonth, d)
    .filter((x) => month(x) === month(d) && x <= d)
    .pop();
  if (!prevue) return false;
  if (s.lastRunOn && day(s.lastRunOn) >= prevue) return false;
  return true;
}

/**
 * La date du prochain versement, pour le dire au client.
 *
 * Elle se calcule sur le calendrier, pas sur ce que le robot fera : c'est une
 * promesse affichée, et une promesse qui dépendrait de l'état d'une machine ne
 * vaudrait rien.
 */
/**
 * LE PREMIER VERSEMENT D'UN JOUR QU'ON VIENT DE CHOISIR.
 *
 * Ce mois-ci si le jour est encore devant, le mois prochain sinon. C'est la
 * seule chose que le client veut savoir en posant son doigt sur un numéro, et
 * le formulaire ne la disait pas : il donnait la règle — « du 1 au 28 » — et
 * pas la conséquence.
 *
 * Elle vit ici et non dans l'écran pour deux raisons. L'une est l'habitude de
 * la maison : « nextRun » posait déjà le même calcul, et deux copies finissent
 * par diverger un 31 décembre. L'autre tient au rendu : « new Date() » pendant
 * un rendu donne une valeur au serveur et une autre au navigateur, donc le
 * jour d'aujourd'hui se passe en argument.
 */
export function premierVersement(dayOfMonth: number, today: string): string {
  const d = day(today);
  return datesAutour(dayOfMonth, d).find((x) => x >= d) ?? dateDuVersement(Number(d.slice(0, 4)) + 1, 1, dayOfMonth);
}

export function nextRun(s: StandingOrder, today: string): string | null {
  if (s.state !== "active") return null;
  const d = day(today > s.startsOn ? today : s.startsOn);
  // La première date prévue qui reste à venir et que le robot n'a pas déjà traitée.
  const candidate = datesAutour(s.dayOfMonth, d).find((x) => x >= d && !(s.lastRunOn && day(s.lastRunOn) >= x));
  if (!candidate) return null;
  if (s.endsOn && candidate > day(s.endsOn)) return null;
  return candidate;
}

/** Le libellé porté par l'ordre produit : le client doit le reconnaître sur son relevé. */
export function instalmentLabel(s: StandingOrder, on: string): string {
  return `Épargne programmée ${s.ref} · versement du ${on}`;
}

/** Celui d'un réinvestissement, qui nomme sa source plutôt qu'un calendrier. */
export function reinvestLabel(s: StandingOrder, on: string, montant: number): string {
  return `Réinvestissement ${s.ref} · ${montant.toLocaleString("fr-FR")} FCFA encaissés au ${on}`;
}

/**
 * Un réinvestissement est-il exécutable, et de combien ?
 *
 * Il ne se demande pas « quel jour sommes-nous » mais « qu'est-ce qui est
 * arrivé ». Le montant est l'argent disponible, c'est-à-dire encaissé et
 * n'attendant aucune autre opération ; le plancher évite un ordre dérisoire,
 * dont les frais mangeraient le coupon.
 *
 * Le robot ne choisit toujours rien : le client a fixé la destination et le
 * plancher à la signature, et le montant vient du marché, pas du desk.
 */
export function reinvestissementDu(s: StandingOrder, disponible: number): { montant: number; raison?: string } {
  if (s.state !== "active") return { montant: 0, raison: "l'instruction n'est pas active" };
  if (s.source !== "encaissements") return { montant: 0, raison: "cette instruction est alimentée par virement" };
  if (disponible <= 0) return { montant: 0, raison: "rien n'est encore encaissé" };
  if (disponible < s.minAmount) return { montant: 0, raison: "sous le plancher fixé à la signature" };
  return { montant: disponible };
}

/**
 * L'argent inoccupé qu'une instruction de réinvestissement réclame.
 *
 * Sans cela, le desk verrait « à restituer » sur un coupon que le robot va
 * placer le lendemain, et le lui renverrait. La politique des espèces ne dit
 * pas qu'un franc doit repartir, elle dit qu'un franc doit avoir une
 * destination : une instruction active en est une.
 */
export function reclameParReinvestissement(idle: number, instructions: StandingOrder[]): number {
  const vivantes = instructions.filter((s) => s.state === "active" && s.source === "encaissements");
  if (!vivantes.length) return 0;
  const plancher = Math.min(...vivantes.map((s) => s.minAmount));
  return idle >= plancher ? idle : 0;
}
