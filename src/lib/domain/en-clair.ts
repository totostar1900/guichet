import type { Offer } from "./types";

/**
 * « EN CLAIR » : CE QU'UNE LIGNE VEUT DIRE POUR UN NOVICE (28 novembre 2026, le client : « les novices ne savent pas lire les tuiles, surtout les tuiles étendues et les fiches »).
 *
 * UNE PHRASE ET TROIS LIGNES, calculées des seules données de la ligne, jamais d'un avis : ce qu'on peut gagner, quand on récupère son argent, ce qui peut mal tourner. Les trois
 * curseurs sont ceux de la présentation « Investir avec Guichet ».
 *
 * LE TON (ETALON.md § 10) : un engagement de l'émetteur se dit comme un engagement (« s'engage à verser »), jamais comme un gain acquis ; un gain possible se dit au conditionnel ou avec
 * « peut ». Le risque vient toujours AVEC le gain, jamais seul, jamais retiré. Ce fichier ne lit rien : il reçoit la ligne, et rend une CLEF et ses paramètres ; les mots sont dans
 * `en-clair-textes.ts`, qui porte les clefs de traduction.
 */
export type FamilleEnClair = "dette" | "bon" | "action" | "fonds";

export interface EnClair {
  famille: FamilleEnClair;
  /** Les paramètres communs aux quatre lignes. */
  params: Record<string, string>;
}

const nombre = (n: number): string => n.toLocaleString("fr-FR").replace(/ /g, " ");

/** La famille de lecture d'une ligne, ou rien quand le novice n'a rien à y comprendre de plus (un rachat, une opération sans titre). */
export function familleEnClair(o: Offer): FamilleEnClair | undefined {
  if (o.kind === "FONDS") return "fonds";
  if (o.kind === "BTA") return "bon";
  /* Une introduction ou une augmentation de capital (« ACTIONS ») s'achète comme une action : une part de la société. */
  if (o.kind === "ACTIONS") return "action";
  if (o.kind === "MARCHE") return o.instrument === "action" ? "action" : "dette";
  if (o.kind === "OTA" || o.kind === "APE") return "dette";
  return undefined;
}

export function enClairDe(o: Offer): EnClair | undefined {
  const famille = familleEnClair(o);
  if (!famille) return undefined;
  const annee = o.maturityOn ? o.maturityOn.slice(0, 4) : "";
  const coupon = o.couponRate != null ? String(o.couponRate).replace(".", ",") : "";
  const params: Record<string, string> = {
    emetteur: o.issuer || o.title,
    societe: o.issuer || o.title,
    gestionnaire: o.fund?.manager ?? o.issuer,
    annee,
    coupon,
    nominal: nombre(o.nominal),
    montant: o.couponRate != null ? nombre(Math.round((o.nominal * o.couponRate) / 100)) : "",
  };
  return { famille, params };
}

/** La clef du texte d'une ligne : la phrase est plus précise quand l'échéance et le coupon sont connus. */
export const cleDeLaPhrase = (e: EnClair): "dette" | "dette_sans_coupon" | "dette_sans_echeance" | "bon" | "action" | "fonds" => {
  if (e.famille !== "dette") return e.famille;
  if (!e.params.coupon) return "dette_sans_coupon";
  return e.params.annee ? "dette" : "dette_sans_echeance";
};
