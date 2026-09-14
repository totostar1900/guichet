import type { DisplayStatus, IntentState, IntentType, Offer } from "./types";
import { isPast } from "./status";

export const INTENT_LABEL: Record<IntentType, string> = {
  appetit: "Appétit",
  ferme: "Prise ferme",
  info: "Information",
  rappel: "Rappel",
  cession: "Cession",
};

export const INTENT_STATE_LABEL: Record<IntentState, string> = {
  recue: "À traiter",
  confirmee: "Confirmée",
  transmise: "Transmise SVT",
  servie: "Servie",
  non_servie: "Non servie",
  reglee: "Réglée",
  annulee: "Annulée",
};

/** Which intents make sense for an offer in a given state. First = default. */
export function allowedIntents(o: Offer, s: DisplayStatus): IntentType[] {
  if (o.kind === "RACHAT") return isPast(s) ? ["info"] : ["cession", "info"];
  if (isPast(s)) return ["info", "rappel"];
  if (s === "upcoming") return ["appetit", "rappel", "info"];
  return ["ferme", "appetit", "info", "rappel"];
}

/** Legal next states from the desk's point of view. */
export function nextStates(state: IntentState, type: IntentType): IntentState[] {
  const firm = type === "ferme" || type === "cession";
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
