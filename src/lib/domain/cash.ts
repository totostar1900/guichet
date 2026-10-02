import type { Intent } from "./types";

/**
 * Le journal des espèces d'un client, et la règle qui gouverne son solde.
 *
 * Deux choses vivent ici, et les confondre est l'erreur à éviter.
 *
 * Le **journal** est une comptabilité : ce qui est entré, ce qui est sorti, ce
 * qui reste dû à qui. Il n'est pas une activité réglementée, il est la
 * condition de toute activité. Sans lui, la maison ne sait pas ce qu'elle doit
 * à chacun, et aucun des services qui font passer l'argent d'un instrument à
 * l'autre ne tient debout.
 *
 * LA RÈGLE A CHANGÉ LE 2 OCTOBRE 2026, et ce module portait l'ancienne.
 *
 * Il disait : « un franc qui dort sans destination ressemble à un dépôt, et la
 * maison n'a pas d'agrément pour en recevoir ». Ce raisonnement partait d'une
 * prémisse fausse, celle que l'argent du client ne passe pas par la maison. Il
 * y passe déjà, dans les deux sens : à l'aller pour le dépôt à la BEAC sur une
 * adjudication ou à la BVMAC sur le marché financier, au retour pour les
 * paiements du marché, qui reviennent sur ces mêmes comptes.
 *
 * Deux réponses de la maison ont donc remplacé la question. L'argent qui s'y
 * trouve APPARTIENT AU CLIENT, et il peut y rester AUSSI LONGTEMPS QUE LE
 * CLIENT LE SOUHAITE.
 *
 * Trois conséquences, et la troisième est celle que le code porte ici.
 *
 *   La ségrégation devient une obligation du présent, et non d'un futur
 *   hypothétique : ce journal est le seul endroit qui dit à qui appartient
 *   chaque franc des comptes de la maison.
 *
 *   Le client doit pouvoir lire son solde, et le lit déjà : « disponible »,
 *   dans sa console, dans Trader, et sur la page du réinvestissement.
 *
 *   LA RESTITUTION CESSE D'ÊTRE UN BALAYAGE ET DEVIENT UNE DEMANDE. C'est la
 *   différence que « aussi longtemps que le client le souhaite » impose : sans
 *   délai, rien ne repart de soi-même, et le souhait du client doit pouvoir
 *   s'exprimer et se suivre. Voir `cash-payouts`.
 *
 * La politique reste une politique, et vit désormais là où les décisions de
 * maison vivent, dans le référentiel, avec la fenêtre déléguée, le signal
 * d'appariement et le barème de garde (`lib/policy.ts`). La fermer de nouveau
 * est un geste de responsable, pas un déploiement.
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
  /** La date de valeur : le jour où l'argent est arrivé, non celui de l'échéance. */
  at: string;
  /** Toujours positif : le sens vient de `kind`. */
  amount: number;
  kind: CashKind;
  label: string;
  /** L'opération à laquelle cet argent est affecté. */
  intentId?: string;
  /** La date au-delà de laquelle l'affectation ne tient plus. */
  dueBy?: string;
  /**
   * La clef du flux d'échéancier que ce mouvement encaisse, s'il en encaisse un.
   *
   * Elle s'écrit au moment de l'enregistrement, et c'est elle qui permet de
   * dire « reçu » plutôt que « échu ». Rapprocher après coup par montant et par
   * date confondrait deux coupons du même jour sur deux lignes voisines, et une
   * comptabilité qui devine n'est pas une comptabilité. Voir `encaissement.ts`.
   */
  flowKey?: string;
  /**
   * La pièce qui atteste ce mouvement : une ligne de relevé, un numéro d'avis
   * du teneur de compte.
   *
   * Sans elle, un encaissement n'est pas un constat mais une présomption, et
   * c'est la première chose qu'un contrôleur demande. Obligatoire dès que le
   * mouvement porte une clef de flux, parce qu'alors il affirme qu'une échéance
   * a été réglée.
   */
  evidence?: string;
  /**
   * Ce que l'échéancier annonçait, quand ce mouvement solde une échéance.
   *
   * Le garder rend l'écart durable. Sans lui, un coupon payé 480 000 au lieu de
   * 500 000 s'inscrit pour 480 000 et plus rien ne dit qu'il manque 20 000 :
   * la comptabilité est juste, et la créance a disparu.
   */
  expected?: number;
  /**
   * La période de droits de garde que ce mouvement règle, « 2026-T3 ».
   *
   * Elle rend la facturation idempotente : un avis émis deux fois pour le même
   * trimestre serait un double prélèvement, et personne ne le verrait passer.
   * Voir `garde.ts`.
   */
  feePeriod?: string;
}

/**
 * La demande de restitution d'un client, et sa réponse.
 *
 * Elle existe parce que « aussi longtemps que le client le souhaite » exige que
 * le souhait ait un endroit. Sans elle, le seul chemin de sortie serait un
 * message que personne n'enregistre.
 *
 * Une demande n'est pas un mouvement. `askedAmount` est le disponible au moment
 * où le client a demandé ; `paidAmount` est ce qui a réellement été viré, et il
 * se recalcule au paiement parce que le solde a pu bouger entre les deux. Les
 * confondre ferait croire qu'une demande vide un solde.
 */
export interface CashPayout {
  id: string;
  userId: string;
  askedAt: string;
  askedAmount: number;
  note?: string;
  state: "demandee" | "payee" | "refusee";
  closedAt?: string;
  closedBy?: string;
  /** Obligatoire sur un refus : c'est l'argent du client qu'on garde. */
  closedReason?: string;
  paidAmount?: number;
  /** Le mouvement de restitution au journal. */
  cashEntry?: string;
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

export interface CashPolicy {
  /** La maison peut-elle garder un solde sans destination ? Oui depuis le 2 octobre 2026. */
  holdIdle: boolean;
  /**
   * Le délai au-delà duquel un solde inoccupé repart de lui-même, ou `null`
   * quand il n'y en a pas.
   *
   * `null` n'est pas un zéro ni une absence de réglage : c'est la réponse de la
   * maison, « aussi longtemps que le client le souhaite ». Un nombre ici
   * rétablirait une échéance que personne n'a décidée.
   */
  graceDays: number | null;
}

/**
 * La règle en vigueur : le solde reste, et ne repart que sur demande.
 *
 * C'est le défaut du code parce que c'est la décision prise, au même titre que
 * la fenêtre déléguée est ouverte par défaut dans `lib/policy.ts`. Une ligne du
 * référentiel la remplace sans déploiement.
 */
export const OUVERTE: CashPolicy = { holdIdle: true, graceDays: null };

/**
 * La règle d'avant, gardée parce qu'un responsable peut vouloir refermer.
 *
 * Elle renvoie tout solde inoccupé, immédiatement. Ce n'est plus la position de
 * la maison, et ce n'est plus le défaut : c'est un geste, qui laisse sa trace.
 */
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
 * Ce qui repart vers la banque du client SANS QU'IL L'AIT DEMANDÉ.
 *
 * Sous la règle en vigueur, zéro : il n'y a pas de délai, donc rien ne repart
 * de soi-même. Ce que le client peut réclamer est son solde inoccupé, que
 * `cashPosition` donne, et il le réclame par une demande qui se suit.
 *
 * La fonction garde son calcul pour les deux autres cas : la politique fermée,
 * qui renvoie tout, et une politique à délai, qu'un responsable pourrait écrire
 * et qui renverrait au-delà. Le défaut est désormais la règle en vigueur, et
 * non plus la plus stricte des trois : une lecture manquée ne doit pas renvoyer
 * l'argent d'un client qui a demandé à le garder.
 */
export function toRestore(entries: CashEntry[], intents: Intent[], policy: CashPolicy = OUVERTE, now = new Date()): number {
  const p = cashPosition(entries, intents, now);
  if (p.idle <= 0) return 0;
  if (!policy.holdIdle) return p.idle;
  if (policy.graceDays == null) return 0;
  if (!p.idleSince) return 0;
  const days = Math.floor((now.getTime() - new Date(p.idleSince).getTime()) / 86_400_000);
  return days > policy.graceDays ? p.idle : 0;
}

/**
 * Une opération peut-elle laisser cet argent sur la plateforme ?
 *
 * La question se posait avant d'accepter une provision : le client virait une
 * somme et il fallait qu'elle serve à quelque chose. Sous la règle en vigueur
 * la réponse est oui, parce que cet argent est le sien et qu'il peut l'y
 * laisser. La porte reste là pour la politique fermée.
 */
export function mayHold(entry: Pick<CashEntry, "kind" | "intentId">, policy: CashPolicy = OUVERTE): boolean {
  if (!isIncoming(entry.kind)) return true;
  return Boolean(entry.intentId) || policy.holdIdle;
}
