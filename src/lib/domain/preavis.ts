import { isDue, type StandingOrder } from "./standing";

/**
 * Prévenir avant, et laisser le temps de dire non.
 *
 * Le robot replaçait l'argent, PUIS prévenait. Et l'envoi vivait dans un
 * try/catch vide : « un message qui ne part pas ne doit pas empêcher le
 * versement suivant ». C'était vrai pour le versement suivant, et faux pour
 * celui-là. Une banque qui vous informe d'un prélèvement après l'avoir fait
 * vous informe ; elle ne vous laisse pas décider.
 *
 * DEUX SOURCES, DEUX FAÇONS DE DATER L'OCCURRENCE, et c'est ce qui justifie une
 * table plutôt qu'un calcul refait à l'exécution.
 *
 *   Un VERSEMENT se prévoit : son jour est écrit dans l'instruction. On annonce
 *   la veille et on exécute le jour dit, de sorte que le client garde le jour
 *   qu'il a choisi.
 *
 *   Un RÉINVESTISSEMENT ne se prévoit pas : c'est l'argent arrivé qui le
 *   déclenche, et « demain » n'est pas connaissable d'avance. On annonce le jour
 *   où l'argent est là, et on exécute après le délai.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un test l'atteint sans monter de base.
 */

export type EtatPreavis = "annoncee" | "arretee" | "executee" | "perimee";

export interface Preavis {
  id: string;
  standingId: string;
  userId: string;
  dueOn: string;
  /** Le montant annoncé, qui est le PLAFOND de l'exécution. */
  amount: number;
  announcedAt: string;
  /** Le préavis est-il réellement parti ? Faux bloque l'exécution, à dessein. */
  noticeSent: boolean;
  noticeError?: string;
  state: EtatPreavis;
  closedAt?: string;
  stopReason?: string;
  intentId?: string;
  /** Les ordres produits : plusieurs quand la clé de répartition partage. */
  intents?: string[];
  paidAmount?: number;
}

/** Le délai entre le préavis et l'exécution : une décision de maison. */
export interface StandingPolicy {
  noticeDays: number;
}

/**
 * Un jour de préavis par défaut, et non zéro.
 *
 * Zéro rétablirait l'ancien comportement sous un nouveau nom : annoncer et
 * exécuter le même jour, c'est exécuter sans préavis. Un jour est le minimum qui
 * laisse au client le temps de lire et de dire non.
 */
export const PREAVIS_DEFAUT: StandingPolicy = { noticeDays: 1 };

/* Midi UTC comme ancre : à minuit, un décalage d'heure d'été ferait sauter ou
   répéter un jour, et une occurrence sautée est un versement perdu. */
const jourPlus = (iso: string, n: number): string => new Date(new Date(`${iso}T12:00:00.000Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Le jour prévu de l'exécution, selon la source.
 *
 * Pour un versement, c'est le jour que le client a choisi : on l'annonce la
 * veille, et le décaler d'un jour parce qu'on prévient serait lui prendre son
 * choix pour lui rendre un service.
 */
export function dueOnDuPreavis(s: Pick<StandingOrder, "source" | "dayOfMonth" | "startsOn" | "endsOn" | "lastRunOn">, aujourdHui: string, policy: StandingPolicy): string | null {
  const jour = jourPlus(aujourdHui, policy.noticeDays);
  if (s.source === "encaissements") return jour;
  /* UNE SEULE FORMULE POUR LES DEUX SOURCES, et elle rend bien au versement le
     jour que le client a choisi : annoncée la veille, l'occurrence du 5 est
     datée du 5. Chercher le jour échu le plus tard dans la fenêtre, comme je
     l'avais d'abord écrit, datait de demain un versement qu'on croyait
     rattraper.
     Le rattrapage coûte donc un jour : un versement du 5 que le robot n'a pas
     traité part le 10 s'il le découvre le 9, parce qu'il faut bien prévenir.
     C'est le prix de « jamais d'exécution non annoncée », et il est petit
     devant un mois sauté.
     `isDue` porte le rattrapage et la consommation du mois, et on ne les
     réécrit pas ici. */
  return isDue(s as StandingOrder, jour) ? jour : null;
}

export type RefusDExecution = "pas_annonce" | "pas_parti" | "arrete" | "trop_tot" | "deja";

/**
 * Pourquoi cette occurrence ne s'exécute pas, ou rien.
 *
 * `pas_parti` est la règle qui compte : un préavis qui a échoué laisse
 * l'occurrence en vie sans l'exécuter. Le risque est qu'un client au canal cassé
 * n'ait plus de versement, et c'est assumé : l'inverse est d'engager son argent
 * en silence, ce que tout ce lot corrige.
 */
export function pourquoiPasExecuter(p: Preavis | undefined, aujourdHui: string): RefusDExecution | null {
  if (!p) return "pas_annonce";
  if (p.state === "arretee") return "arrete";
  if (p.state !== "annoncee") return "deja";
  if (!p.noticeSent) return "pas_parti";
  if (p.dueOn > aujourdHui) return "trop_tot";
  return null;
}

/**
 * Ce qui s'exécute réellement : au plus ce qui a été annoncé.
 *
 * Entre le préavis et l'exécution, un coupon peut tomber. Exécuter plus que ce
 * qui a été annoncé romprait la promesse sur laquelle le client a choisi de ne
 * rien dire ; le surplus aura son propre préavis le lendemain. Moins est permis,
 * parce que l'argent a pu partir, et rien du tout en dessous du plancher.
 */
export function montantAExecuter(annonce: number, disponible: number, plancher: number): number {
  const m = Math.min(Math.round(annonce), Math.round(disponible));
  return m >= Math.round(plancher) && m > 0 ? m : 0;
}

/** Ce que le client peut encore arrêter : ses occurrences annoncées et non échues. */
export const arretables = (preavis: Preavis[], aujourdHui: string): Preavis[] =>
  preavis.filter((p) => p.state === "annoncee" && p.dueOn >= aujourdHui).sort((a, b) => a.dueOn.localeCompare(b.dueOn));

/**
 * Pourquoi un arrêt n'est plus possible, ou rien.
 *
 * Une occurrence dont le jour est passé n'est pas arrêtable : ou le robot l'a
 * exécutée, ou il va le faire au prochain tour, et laisser croire qu'on
 * l'arrête serait un bouton qui ment.
 */
export function pourquoiPasArreter(p: Preavis | undefined, aujourdHui: string): string | null {
  if (!p) return "Cette opération ne vous appartient pas, ou elle n'existe plus.";
  if (p.state === "arretee") return "Elle est déjà arrêtée.";
  if (p.state === "executee") return "Elle est déjà partie : le desk peut encore annuler l'ordre avant son règlement.";
  if (p.state === "perimee") return "Elle n'a pas eu lieu.";
  if (p.dueOn < aujourdHui) return "Son jour est passé : l'ordre part au prochain tour du robot, et le desk peut l'annuler avant règlement.";
  return null;
}
