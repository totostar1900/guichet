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
 * Le jour va de 1 à 28. Tous les mois ont ces jours-là. Accepter le 31
 * obligerait quelqu'un à décider ce qu'on fait en février, et cette décision
 * n'appartient pas à la maison.
 *
 * Ce qu'on fait quand l'exécution est impossible se décide à la signature, par
 * le client, et pas au moment où ça bloque. Un fonds suspendu, un minimum
 * relevé : on passe ce versement, ou l'on arrête. Improviser reviendrait à
 * décider à sa place.
 */

export type StandingState = "active" | "suspendue" | "terminee" | "annulee";
export type OnBlocked = "passer" | "arreter";

export interface StandingOrder {
  id: string;
  ref: string;
  userId: string;
  clientName: string;
  clientSegment: string;
  /** La destination, fixée à la signature. */
  offerId: string;
  amount: number;
  /** 1 à 28. */
  dayOfMonth: number;
  startsOn: string;
  endsOn?: string;
  state: StandingState;
  onBlocked: OnBlocked;
  channel: "WhatsApp" | "Appel" | "E-mail";
  contactPhone?: string;
  contactEmail?: string;
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
  dayOfMonth: number;
  startsOn: string;
  endsOn?: string;
  onBlocked: OnBlocked;
  channel: "WhatsApp" | "Appel" | "E-mail";
  contactPhone?: string;
  contactEmail?: string;
}

export const STANDING_STATE_LABEL: Record<StandingState, string> = {
  active: "Active",
  suspendue: "Suspendue",
  terminee: "Terminée",
  annulee: "Arrêtée",
};

const day = (iso: string) => iso.slice(0, 10);
const month = (iso: string) => iso.slice(0, 7);

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

/** Ce qui empêche cette instruction, en toutes lettres, ou rien. */
export function standingBlock(o: Offer | undefined, i: { amount: number; dayOfMonth: number; startsOn: string; endsOn?: string }): string[] {
  const out: string[] = [];
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
    if (min > 0 && i.amount < min) out.push(`Le versement minimum sur ce fonds est de ${min.toLocaleString("fr-FR")} FCFA.`);
  }
  if (!(i.amount > 0)) out.push("Le montant du versement manque.");
  if (!Number.isInteger(i.dayOfMonth) || i.dayOfMonth < 1 || i.dayOfMonth > 28) out.push("Le jour du versement va du 1 au 28 : tous les mois ont ces jours-là.");
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
  if (s.lastRunOn && month(s.lastRunOn) >= month(d)) return false;
  return Number(d.slice(8, 10)) >= s.dayOfMonth;
}

/**
 * La date du prochain versement, pour le dire au client.
 *
 * Elle se calcule sur le calendrier, pas sur ce que le robot fera : c'est une
 * promesse affichée, et une promesse qui dépendrait de l'état d'une machine ne
 * vaudrait rien.
 */
export function nextRun(s: StandingOrder, today: string): string | null {
  if (s.state !== "active") return null;
  const d = day(today > s.startsOn ? today : s.startsOn);
  const [y, m] = [Number(d.slice(0, 4)), Number(d.slice(5, 7))];
  const pad = (n: number) => String(n).padStart(2, "0");
  const at = (yy: number, mm: number) => `${yy}-${pad(mm)}-${pad(s.dayOfMonth)}`;
  // Ce mois-ci s'il reste à venir et qu'aucun versement n'y a déjà eu lieu ; sinon le suivant.
  const thisMonth = at(y, m);
  const done = s.lastRunOn && month(s.lastRunOn) >= `${y}-${pad(m)}`;
  const candidate = !done && thisMonth >= d ? thisMonth : m === 12 ? at(y + 1, 1) : at(y, m + 1);
  if (s.endsOn && candidate > day(s.endsOn)) return null;
  return candidate;
}

/** Le libellé porté par l'ordre produit : le client doit le reconnaître sur son relevé. */
export function instalmentLabel(s: StandingOrder, on: string): string {
  return `Épargne programmée ${s.ref} · versement du ${on}`;
}
