import type { DisplayStatus, Intent, IntentState, IntentType, Offer } from "./types";
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
  contre_proposee: "Contre-proposition",
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
      return ["confirmee", "contre_proposee", "annulee"];
    // Le client a répondu, ou l’échéance est passée : on confirme ce qu’il a accepté,
    // on revient à l’ordre d’origine, ou l’on clot. Une contre-proposition ne se
    // transmet jamais telle quelle : sans le oui du client, elle n’est qu’une offre.
    case "contre_proposee":
      return ["confirmee", "recue", "annulee"];
    case "confirmee":
      return firm ? ["transmise", "contre_proposee", "annulee"] : ["contre_proposee", "annulee"];
    case "transmise":
      return ["servie", "non_servie"];
    case "servie":
      return ["reglee"];
    default:
      return [];
  }
}

/**
 * Le passage nommé comme un acte, et ce qu’il produit. « Chaque passage est
 * journalisé et produit ses documents » était vrai et inutile : posée une fois
 * pour les cinq cas, la phrase ne disait à personne ce que CE bouton allait
 * faire. Ici chaque état porte la sienne.
 */
export const STATE_PASSAGE: Partial<Record<IntentState, string>> = {
  confirmee: "Confirmer l’ordre au nom du client",
  transmise: "Transmettre l’ordre au marché",
  servie: "Porter le résultat : servie",
  non_servie: "Porter le résultat : non servie",
  reglee: "Constater le règlement",
  recue: "Revenir à l’ordre d’origine",
};

export const STATE_EFFECT: Partial<Record<IntentState, string>> = {
  confirmee: "Le bordereau est édité et versé au dossier, l’ordre entre au carnet, et le client est prévenu sur le canal qu’il a demandé.",
  transmise: "La demande part avec celles des autres investisseurs. Une fois partie, elle ne se retire plus : le prix retenu et le montant servi ne dépendent plus de la maison.",
  servie: "Le montant servi et le prix se portent tels qu’ils sont publiés : c’est ce chiffre qui fonde l’avis d’opéré et le rendement que le client lira.",
  non_servie: "La séance n’a rien servi sur cette demande. Le client en est informé, et rien n’est débité.",
  reglee: "Les espèces sont débitées, les titres inscrits au nom du client au dépositaire, et l’avis d’opéré part avec le relevé. L’ordre est alors clos.",
  recue: "L’ordre reprend les conditions que le client avait envoyées, et la contre-proposition est abandonnée.",
};

/** Les deux passages qui sortent de la maison : après eux, on ne revient pas. */
export const STATE_FINAL = new Set<IntentState>(["transmise", "reglee"]);

/** Le passage qui fait avancer l’ordre, distingué des deux issues qui le détournent. */
export const avancement = (next: IntentState[]): IntentState[] => next.filter((st) => st !== "annulee" && st !== "contre_proposee" && st !== "recue");

export const STATE_ACTION_LABEL: Partial<Record<IntentState, string>> = {
  confirmee: "Confirmer",
  contre_proposee: "Proposer d’autres conditions",
  recue: "Revenir à l’ordre d’origine",
  transmise: "Transmettre",
  servie: "Servie",
  non_servie: "Non servie",
  reglee: "Réglée",
  annulee: "Annuler",
};

/**
 * QUELS ORDRES SE SIGNENT ICI.
 *
 * Les parts d'OPCVM d'abord, et c'est un choix : le montant y est ferme, les
 * droits d'entrée sont au référentiel, seul le nombre de parts dépend de la VL
 * de centralisation. Sur un titre, le montant lui-même dépend du prix servi, et
 * il faudra signer un plafond : même mécanisme, une borne de plus, plus tard.
 */
/*
 * L'ÉTAT « CONFIRMÉE » SE SIGNE AUSSI, ET IL LE FAUT.
 *
 * La première écriture n'acceptait que « reçue », l'ordre tout neuf du nouveau
 * parcours. Mesuré le 8 octobre 2026 en production : une souscription de
 * 100 000 FCFA confirmée le 5 octobre, donc AVANT que la signature dans
 * l'application existe, attendait toujours une signature que le desk devait
 * récolter dehors. La bande disait « Signer », la page de l'ordre s'ouvrait,
 * et elle n'offrait rien : « ordreSignable » y était faux. Un ordre pour
 * lequel la maison attend une signature doit pouvoir se signer là où on
 * l'envoie, sinon la bande ment et la page la contredit.
 */
export const ordreSignable = (i: Intent): boolean =>
  !i.signedAt &&
  (i.state === "recue" || i.state === "confirmee") &&
  (i.type === "souscription" || i.type === "rachat"
    ? true
    : /* LES TITRES SE SIGNENT DÈS QU'ILS PORTENT LEUR BORNE.
         Sur une part, le montant versé est ferme. Sur un titre, c'est la
         dépense qui flotte au prix servi, et une signature sur un montant
         inconnu n'en est pas une : il y faut le plafond « au plus », figé à
         la déclaration (domain/plafond). Sans lui, l'ordre reste au desk,
         qui le mènera par son canal plutôt que de laisser signer à vide. */
      (i.type === "ferme" || i.type === "achat") && typeof i.maxAmount === "number" && i.maxAmount > 0);

/**
 * CE QUE LA BANDE COMPTE SOUS « VOTRE SIGNATURE », ET POURQUOI C'EST LA MÊME
 * RÈGLE QUE CI-DESSUS.
 *
 * Deux défauts mesurés le 8 octobre 2026, en production, le même jour.
 *
 * Le compteur prenait « état confirmée », tous TYPES confondus : une question
 * posée au desk (type « info »), prise en main par lui, s'annonçait « 1 ordre,
 * le bulletin est prêt ». Il n'y avait rien à signer, et pour cause.
 *
 * Puis, le type corrigé, le compteur aurait compté des ordres que cette
 * application ne sait PAS signer : un ordre ferme sur un titre attend un
 * plafond qui n'existe pas encore. La bande aurait envoyé sur une page sans
 * bouton, ce qui est le défaut qu'on vient de fermer.
 *
 * Le compteur suit donc `ordreSignable`, mot pour mot : on n'annonce une
 * signature que là où on sait la recueillir. Ce qui se signe encore dehors
 * reste au desk, qui l'envoie par son canal.
 */
export const attendUneSignature = ordreSignable;
