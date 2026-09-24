import type { Intent } from "./types";

/**
 * Le journal des espèces d'un client, et la règle qui gouverne l'argent inoccupé.
 *
 * Deux choses vivent ici, et les confondre est l'erreur à éviter.
 *
 * Le **journal** est une comptabilité : ce qui est entré, ce qui est sorti, ce
 * qui reste dû à qui. Il n'est pas une activité réglementée, il est la
 * condition de toute activité. Sans lui, la maison ne sait pas ce qu'elle doit
 * à chacun, et aucun des services qui font passer l'argent d'un instrument à
 * l'autre ne tient debout.
 *
 * La **détention** d'un solde est autre chose. Un franc qui attend le règlement
 * d'une opération est du règlement, et c'est le métier ordinaire d'une société
 * de bourse. Un franc qui dort sans destination ressemble à un dépôt, et la
 * maison n'a pas d'agrément pour en recevoir. La distinction ne tient donc pas
 * au montant ni à la durée seule, mais à l'affectation : tout franc posé ici
 * porte une opération et une échéance, ou il repart.
 *
 * D'où le verrou. Le journal enregistre toujours ; la détention d'un solde
 * inoccupé obéit à une politique, fermée par défaut, qui s'ouvrira le jour où
 * la réponse réglementaire sera écrite et pas avant.
 */

/** D'où vient un mouvement, ou où il va. */
export type CashKind =
  | "provision" // le client vire des fonds en vue d'une opération
  | "coupon" // un coupon tombé
  | "remboursement" // un capital remboursé à l'échéance
  | "produit_vente" // le produit d'une vente ou d'un rachat
  | "souscription" // une souscription ou un achat, réglé
  | "frais" // commission, droits
  | "restitution"; // l'argent renvoyé à la banque du client

/** Les entrées, au signe près : ce qui grossit le solde et ce qui le réduit. */
const INCOMING: CashKind[] = ["provision", "coupon", "remboursement", "produit_vente"];
export const isIncoming = (k: CashKind): boolean => INCOMING.includes(k);

/**
 * Un mouvement d'espèces, tel qu'il se garde.
 *
 * `intentId` et `dueBy` portent l'affectation : à quelle opération cet argent
 * est destiné, et jusqu'à quand. Un mouvement entrant sans affectation est de
 * l'argent inoccupé, ce que la politique interdit tant qu'elle est fermée.
 */
export interface CashEntry {
  id: string;
  userId: string;
  at: string;
  /** Toujours positif : le sens vient de `kind`. */
  amount: number;
  kind: CashKind;
  label: string;
  /** L'opération à laquelle cet argent est affecté. */
  intentId?: string;
  /** La date au-delà de laquelle l'affectation ne tient plus. */
  dueBy?: string;
}

export interface CashPosition {
  /** Tout ce que la maison doit au client, affecté ou non. */
  balance: number;
  /** Affecté à une opération encore vivante. */
  assigned: number;
  /** Sans destination, ou dont l'affectation est échue : à restituer. */
  idle: number;
  /** Depuis quand le plus ancien franc inoccupé l'est. */
  idleSince?: string;
}

/** La politique : ouverte le jour où la réponse réglementaire sera écrite. */
export interface CashPolicy {
  /** La maison peut-elle garder un solde sans destination ? */
  holdIdle: boolean;
  /** Au-delà, une affectation échue devient de l'argent inoccupé à restituer. */
  graceDays: number;
}

export const CLOSED: CashPolicy = { holdIdle: false, graceDays: 0 };

const signed = (e: CashEntry) => (isIncoming(e.kind) ? e.amount : -e.amount);
const day = (iso: string) => iso.slice(0, 10);

/**
 * Une affectation tient tant que son opération vit et que sa date n'est pas
 * passée. Une intention close, servie ou non, ne retient plus rien : l'argent
 * qu'elle gardait redevient sans destination le jour où elle se ferme.
 */
function held(e: CashEntry, open: Set<string>, today: string): boolean {
  if (!e.intentId) return false;
  if (!open.has(e.intentId)) return false;
  return !e.dueBy || day(e.dueBy) >= today;
}

/**
 * Le solde d'un client, partagé entre ce qui attend une opération et ce qui
 * ne va nulle part.
 *
 * Les sorties se retranchent du solde sans jamais compter comme inoccupées :
 * de l'argent parti n'est pas de l'argent qui dort.
 */
export function cashPosition(entries: CashEntry[], intents: Intent[], now = new Date()): CashPosition {
  const today = day(now.toISOString());
  const open = new Set(intents.filter((i) => i.state !== "annulee" && i.state !== "reglee" && i.state !== "non_servie").map((i) => i.id));
  let balance = 0;
  let assigned = 0;
  let idleSince: string | undefined;
  for (const e of entries) {
    balance += signed(e);
    if (!isIncoming(e.kind)) continue;
    if (held(e, open, today)) assigned += e.amount;
    else if (!idleSince || e.at < idleSince) idleSince = e.at;
  }
  // Le solde peut être inférieur à l'affecté quand des frais l'ont entamé :
  // l'inoccupé ne descend alors pas sous zéro, il n'y a simplement plus rien.
  const idle = Math.max(0, balance - assigned);
  return { balance, assigned, idle, idleSince: idle > 0 ? idleSince : undefined };
}

/**
 * Ce qui doit repartir vers la banque du client, selon la politique.
 *
 * Verrou fermé : tout ce qui est inoccupé. Verrou ouvert : rien, tant que le
 * délai de grâce n'est pas dépassé. Le calcul est le même dans les deux cas,
 * seule la politique change, pour que l'ouverture un jour ne demande pas de
 * réécrire la règle.
 */
export function toRestore(entries: CashEntry[], intents: Intent[], policy: CashPolicy = CLOSED, now = new Date()): number {
  const p = cashPosition(entries, intents, now);
  if (p.idle <= 0) return 0;
  if (!policy.holdIdle) return p.idle;
  if (!p.idleSince) return 0;
  const days = Math.floor((now.getTime() - new Date(p.idleSince).getTime()) / 86_400_000);
  return days > policy.graceDays ? p.idle : 0;
}

/**
 * Une opération peut-elle laisser cet argent sur la plateforme ?
 *
 * La question se pose avant d'accepter une provision : le client vire une somme
 * et il faut qu'elle serve à quelque chose. Sans affectation et verrou fermé,
 * la réponse est non, et l'écran doit le dire plutôt que d'encaisser.
 */
export function mayHold(entry: Pick<CashEntry, "kind" | "intentId">, policy: CashPolicy = CLOSED): boolean {
  if (!isIncoming(entry.kind)) return true;
  return Boolean(entry.intentId) || policy.holdIdle;
}
