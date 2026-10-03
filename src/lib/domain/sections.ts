import { resolveIssuer } from "@/data/issuer-registry";
import type { Offer } from "./types";

/**
 * TROIS LIEUX, PAS TROIS RAYONS.
 *
 * Un titre coté se négocie à un prix, une adjudication s'emporte à une séance,
 * une part de fonds se souscrit à une valeur liquidative. Ce ne sont pas trois
 * familles d'un même catalogue : ce sont trois marchés, avec trois mécaniques
 * et trois calendriers. La bascule « primaire / secondaire » qui coiffait la
 * liste des titres disparaît donc : elle devient le lieu.
 *
 * CE QUE ÇA RÈGLE. Un bon du Trésor clôturé le 22 septembre restait dans la
 * liste des titres au 4 octobre, parce que cette liste ne retire une ligne du
 * primaire que lorsqu'elle devient cotée, et qu'un bon ne l'est jamais. Mesuré
 * le même jour : neuf séances closes depuis deux à trois semaines y dormaient
 * à l'état « publié », sans prix servi ni dépouillement, au milieu de lignes
 * négociables. Une séance a un cycle, une cote n'a qu'un cours ; une file avec
 * des états se voit quand elle ne se vide pas, une liste de titres non.
 *
 * LES SECTIONS DE LA COTE NE SONT PAS DE NOUS. Le Bulletin Officiel de la Cote
 * range lui-même ses obligations en « etats », « regionales » et « privees »,
 * et nous lisons ce champ depuis le premier jour sans jamais l'afficher. Le
 * découpage ci-dessous reprend ces trois noms, plus le compartiment actions.
 * Il se déduit de la famille de l'émetteur plutôt que du champ du bulletin,
 * pour une raison : une ligne du primaire n'a pas de bulletin, et il faut bien
 * la ranger aussi. Un cliquet vérifie que les deux disent la même chose.
 */
export type Lieu = "cote" | "adjudications" | "fonds";

export type Section = "souscription" | "etats" | "regionales" | "entreprises" | "actions" | "obligations_tresor" | "bons_tresor" | "rachats" | "fonds";

export const LIEU_LABEL: Record<Lieu, string> = { cote: "La cote", adjudications: "Adjudications", fonds: "Fonds" };

/** L'ordre d'affichage, et les seules sections de chaque lieu. */
export const SECTIONS: Record<Lieu, Section[]> = {
  cote: ["souscription", "etats", "regionales", "entreprises", "actions"],
  adjudications: ["obligations_tresor", "bons_tresor", "rachats"],
  fonds: ["fonds"],
};

export const SECTION_LABEL: Record<Section, string> = {
  souscription: "En souscription",
  etats: "États",
  regionales: "Institutions régionales",
  entreprises: "Entreprises",
  actions: "Actions",
  obligations_tresor: "Obligations du Trésor",
  bons_tresor: "Bons du Trésor",
  rachats: "Rachats du Trésor",
  fonds: "Fonds",
};

/** Ce qu'une section est, en une ligne, sous son titre : la règle d'appartenance et rien d'autre. */
export const SECTION_NOTE: Record<Section, string> = {
  souscription: "Émissions ouvertes à la BVMAC : un prix fixé, une fenêtre, puis la cotation.",
  etats: "Emprunts des six États de la zone, cotés en continu.",
  regionales: "La BDEAC, détenue par les six États et la BEAC : ni un État, ni une entreprise.",
  entreprises: "Sociétés et établissements financiers de la zone. Coupon souvent brut.",
  actions: "Le capital d'une société, pas une créance sur elle.",
  obligations_tresor: "Adjugées à la BEAC, avec un coupon et une durée.",
  bons_tresor: "Précomptés : vous payez moins que le nominal et recevez le nominal à l'échéance.",
  rachats: "Le Trésor reprend une ligne avant son terme. Une sortie, pas un placement.",
  fonds: "Souscrits à la prochaine valeur liquidative, jamais à celle affichée.",
};

/** Où vit une ligne. Le lieu dit comment on l'achète. */
export function lieuDe(o: Pick<Offer, "kind">): Lieu {
  if (o.kind === "FONDS") return "fonds";
  if (o.kind === "OTA" || o.kind === "BTA" || o.kind === "RACHAT") return "adjudications";
  return "cote";
}

/** Dans ce lieu, à qui on prête. */
export function sectionDe(o: Pick<Offer, "kind" | "instrument" | "isin" | "issuer" | "title" | "country">): Section {
  switch (o.kind) {
    case "FONDS":
      return "fonds";
    case "OTA":
      return "obligations_tresor";
    case "BTA":
      return "bons_tresor";
    case "RACHAT":
      return "rachats";
    // Un appel public à l'épargne et une introduction ne sont ni une séance de
    // la BEAC ni encore la cote : un prix fixé, une fenêtre, puis la cotation.
    case "APE":
    case "ACTIONS":
      return "souscription";
    default: {
      if (o.instrument === "action") return "actions";
      const f = resolveIssuer(o)?.family;
      if (f === "etat") return "etats";
      if (f === "supranational") return "regionales";
      return "entreprises";
    }
  }
}

/** Le nom du segment que le bulletin imprime, pour les trois sections obligataires de la cote. */
export const SEGMENT_BOC: Partial<Record<Section, string>> = { etats: "etats", regionales: "regionales", entreprises: "privees" };
