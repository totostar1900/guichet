import type { Intent, IntentState } from "./types";

/**
 * LA CHRONOLOGIE D'UN ORDRE, POUR LE DESK SEUL (15 novembre 2026).
 *
 * Le desk lit toutes les dates d'un ordre : la demande, la signature, la couverture, puis chaque passage (confirmation, transmission, exécution,
 * règlement, clôture). Le client n'en lit AUCUNE de cette liste : il ne voit pas nos opérations internes, il reçoit les documents d'information et
 * les contrats (bulletin, avis, appel de fonds, avis d'opéré) que la maison produit déjà. Un essai refuse qu'un écran du client lise ces champs.
 *
 * Un passage atteint mais jamais daté (un ordre réglé avant la migration 0131, que le journal n'a pas vu) s'écrit sans date, avec son mot : « date non
 * enregistrée ». On n'invente pas un jour.
 */
export interface EtapeDatee {
  cle: "demande" | "signature" | "couverture" | "confirmation" | "transmission" | "execution" | "reglement" | "cloture";
  libelle: string;
  /** L'instant, ou rien quand l'étape est atteinte sans date enregistrée. */
  le?: string;
  /** Ce qui précise l'étape : le moyen de signature, la somme réservée, le jour de valeur. Une phrase à traduire et ses variables, jamais un texte déjà composé. */
  detail?: { texte: string; vars?: Record<string, string> };
}

/** Le rang d'un état sur le parcours normal d'un ordre ; -1 hors parcours (reçue, contre-proposée, annulée). */
const RANG: Partial<Record<IntentState, number>> = { confirmee: 1, transmise: 2, servie: 3, non_servie: 3, reglee: 4 };

const METHODE: Record<string, string> = { code: "par code", clef: "par clef de sécurité", appareil: "par l'appareil reconnu" };
const jourDe = (iso: string): string => iso.slice(0, 10);

export function chronologieDeLOrdre(i: Intent): EtapeDatee[] {
  const rang = RANG[i.state] ?? -1;
  const atteinte = (r: number, date?: string): boolean => Boolean(date) || rang >= r;
  const out: EtapeDatee[] = [{ cle: "demande", libelle: "Demande du client", le: i.createdAt }];
  if (i.signedAt) out.push({ cle: "signature", libelle: "Signature", le: i.signedAt, ...(i.signedMethod ? { detail: { texte: METHODE[i.signedMethod] ?? "par un autre moyen" } } : {}) });
  if (i.coveredAt) out.push({ cle: "couverture", libelle: "Couvert sur la provision", le: i.coveredAt, ...(i.coveredAmount != null ? { detail: { texte: "{m} FCFA réservés", vars: { m: Math.round(i.coveredAmount).toLocaleString("fr-FR") } } } : {}) });
  if (atteinte(1, i.confirmedAt)) out.push({ cle: "confirmation", libelle: "Confirmée", ...(i.confirmedAt ? { le: i.confirmedAt } : {}) });
  if (atteinte(2, i.transmittedAt)) out.push({ cle: "transmission", libelle: "Transmise", ...(i.transmittedAt ? { le: i.transmittedAt } : {}) });
  if (i.state === "servie" || i.state === "reglee" || i.servedAt) out.push({ cle: "execution", libelle: "Exécutée", ...(i.servedAt ? { le: i.servedAt } : {}) });
  if (i.state === "reglee" || i.settledAt) out.push({ cle: "reglement", libelle: "Réglée", ...(i.settledAt ? { le: i.settledAt } : {}), ...(i.valueOn ? { detail: { texte: "règlement-livraison le {d}", vars: { d: jourDe(i.valueOn) } } } : {}) });
  if (i.state === "non_servie" || i.state === "annulee" || i.closedAt) out.push({ cle: "cloture", libelle: i.state === "non_servie" ? "Non servie" : "Annulée", ...(i.closedAt ? { le: i.closedAt } : {}) });
  return out;
}
