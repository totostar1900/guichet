import { resolveIssuer } from "@/data/issuer-registry";
import type { Offer } from "./types";
import { offerFamily } from "./status";

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
 * liste des titres au 4 octobre, parce que cette liste ne retirait une ligne du
 * primaire que lorsqu'elle devenait cotée, et qu'un bon ne l'est jamais. Une
 * séance a un cycle, une cote n'a qu'un cours ; une file avec des états se voit
 * quand elle ne se vide pas, une liste de titres non.
 *
 * LES SECTIONS DE LA COTE NE SONT PAS DE NOUS. Le Bulletin Officiel de la Cote
 * range lui-même ses obligations en « etats », « regionales » et « privees »,
 * et nous lisons ce champ depuis le premier jour sans jamais l'afficher. Le
 * découpage ci-dessous reprend ces trois noms, plus le compartiment actions.
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

/**
 * OÙ VIT UNE LIGNE. Le lieu dit comment on l'achète.
 *
 * LE TYPE SE LIT AU REGISTRE, ET NON AU CHAMP « kind ». Mesuré le 4 octobre
 * 2026 : l'abondement congolais CG2A00000668 et son équivalent équato-guinéen
 * portent « OTA » dans « type_key » et « APE » dans « kind », dans la même
 * rangée. Ce sont des adjudications de la BEAC, et elles paraissaient « en
 * souscription » sur la cote.
 *
 * « typeOf » tranche en faveur de « type_key », et tout le reste de
 * l'application passe par lui : le badge de la ligne disait déjà « OTA »
 * pendant que mon rangement disait « APE ». Lire la même source que les autres
 * supprime la question, et donne en prime un classement que le desk corrige
 * depuis le Référentiel plutôt qu'en base.
 */
export function lieuDe(o: Pick<Offer, "kind" | "instrument" | "typeKey">): Lieu {
  switch (offerFamily(o)) {
    case "OPCVM":
      return "fonds";
    case "OTA":
    case "BTA":
    case "RACHAT":
      return "adjudications";
    default:
      return "cote";
  }
}

/** Dans ce lieu, à qui on prête. */
export function sectionDe(o: Pick<Offer, "kind" | "instrument" | "typeKey" | "isin" | "issuer" | "title" | "country">): Section {
  switch (offerFamily(o)) {
    case "OPCVM":
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
    case "IPO":
      return "souscription";
    case "ACTION_COTEE":
      return "actions";
    default: {
      const f = resolveIssuer(o)?.family;
      if (f === "etat") return "etats";
      if (f === "supranational") return "regionales";
      return "entreprises";
    }
  }
}

/** Le nom du segment que le bulletin imprime, pour les trois sections obligataires de la cote. */
export const SEGMENT_BOC: Partial<Record<Section, string>> = { etats: "etats", regionales: "regionales", entreprises: "privees" };
