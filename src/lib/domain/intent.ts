import type { DisplayStatus, IntentState, IntentType, Offer } from "./types";
import { typeOf } from "@/lib/registry";
import { isPast } from "./status";

export const INTENT_LABEL: Record<IntentType, string> = {
  appetit: "Appétit",
  ferme: "Prise ferme",
  info: "Information",
  rappel: "Rappel",
  cession: "Cession",
  achat: "Ordre d'achat",
  vente: "Ordre de vente",
  souscription: "Souscription",
  rachat: "Rachat de parts",
};

/** "Prise ferme reçue", "Appétit reçu" : agreement with the intent noun. */
export function receivedLabel(type: IntentType): string {
  const fem = type === "ferme" || type === "cession" || type === "info" || type === "souscription";
  if (type === "achat" || type === "vente" || type === "rachat") return `${INTENT_LABEL[type]} reçu`;
  return `${INTENT_LABEL[type]} ${fem ? "reçue" : "reçu"}`;
}

export const INTENT_STATE_LABEL: Record<IntentState, string> = {
  recue: "À traiter",
  confirmee: "Confirmée",
  transmise: "Transmise",
  servie: "Servie",
  non_servie: "Non servie",
  reglee: "Réglée",
  annulee: "Annulée",
};

/** Which intents make sense for an offer in a given state. First = default. */
export function allowedIntents(o: Offer, s: DisplayStatus): IntentType[] {
  // A desk-created type says what a client may do while the line is open; built-ins keep the rules below.
  const t = typeOf(o);
  if (!t.builtin) return (o.kind === "MARCHE" || o.kind === "FONDS" ? s === "quoted" : !isPast(s) && s !== "upcoming") ? [...new Set([...t.intentsOpen, "info" as const])] : ["info"];
  if (o.kind === "MARCHE") return s === "quoted" ? ["achat", "vente", "info"] : ["info"];
  if (o.kind === "FONDS") return s === "quoted" ? ["souscription", "rachat", "info"] : s === "on_request" ? ["info", "rappel"] : ["info"];
  if (o.kind === "RACHAT") return isPast(s) ? ["info"] : ["cession", "info"];
  if (isPast(s)) return ["info", "rappel"];
  if (s === "upcoming") return ["appetit", "rappel", "info"];
  return ["ferme", "appetit", "info", "rappel"];
}

/** Intents that become an order the desk transmits (bulletin, appel de fonds, bordereau). */
export const FIRM_TYPES: IntentType[] = ["ferme", "cession", "achat", "vente", "souscription", "rachat"];

/** Legal next states from the desk's point of view. */
export function nextStates(state: IntentState, type: IntentType): IntentState[] {
  const firm = FIRM_TYPES.includes(type);
  switch (state) {
    case "recue":
      return ["confirmee", "annulee"];
    case "confirmee":
      return firm ? ["transmise", "annulee"] : ["annulee"];
    case "transmise":
      return ["servie", "non_servie"];
    case "servie":
      return ["reglee"];
    default:
      return [];
  }
}

export const STATE_ACTION_LABEL: Partial<Record<IntentState, string>> = {
  confirmee: "Confirmer",
  transmise: "Transmettre",
  servie: "Servie",
  non_servie: "Non servie",
  reglee: "Réglée",
  annulee: "Annuler",
};
