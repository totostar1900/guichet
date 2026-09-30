import type { Offer } from "@/lib/domain/types";

/**
 * L'identité d'une ligne, sans un chiffre de marché.
 *
 * Elle vit dans son propre module parce que TROIS surfaces publiques la
 * lisent, et qu'elles doivent dire la même chose : la page d'aperçu, la
 * description de la carte de partage, et l'image dessinée de cette carte. Une
 * seule d'entre elles qui laisserait passer un taux suffirait à annuler la
 * porte, et c'est l'image qui l'a fait le plus longtemps.
 *
 * `offer.title` ne sert à aucune des trois : il porte le coupon, « OTA 5,6 %
 * 2033 ».
 */

/** Le nom d'une nature, sans taux ni montant. */
const NATURE: Record<string, string> = {
  BTA: "Bon du Trésor",
  OTA: "Obligation du Trésor",
  APE: "Obligation",
  ACTIONS: "Action",
  FONDS: "Part de fonds",
  RACHAT: "Obligation",
  MARCHE: "Obligation",
};

/** La durée en mots, sans date : « 26 semaines », « 7 ans », ou rien. */
function duree(o: Offer): string {
  if (!o.maturityOn || !o.settleOn) return "";
  const j = Math.round((Date.parse(o.maturityOn) - Date.parse(o.settleOn)) / 86400000);
  if (!Number.isFinite(j) || j <= 0) return "";
  if (j < 400) return `${Math.round(j / 7)} semaines`;
  const a = Math.round(j / 365);
  return a > 1 ? `${a} ans` : "1 an";
}

/**
 * Où la ligne se traite. C'est une disponibilité, pas une donnée de marché.
 *
 * Seuls les bons et les obligations du Trésor passent par une adjudication ;
 * une obligation d'entreprise cotée n'en vient pas, et la carte de partage
 * d'une BDEAC l'annonçait pourtant « adjudication ». Le reste va sur la cote.
 */
export const marcheDe = (o: Offer): string => (o.kind === "FONDS" ? "OPCVM" : o.kind === "BTA" || o.kind === "OTA" ? "Adjudication" : "Cote BVMAC");

/** La famille, pour la pastille de la bande : elle suit le même partage. */
export const familleDe = (o: Offer): "tresor" | "cote" | "fonds" => (o.kind === "FONDS" ? "fonds" : o.kind === "BTA" || o.kind === "OTA" ? "tresor" : "cote");

export function identite(o: Offer): { nature: string; duree: string; emetteur: string; nom: string; marche: string } {
  const nature = NATURE[o.kind] ?? "Ligne";
  const d = duree(o);
  return { nature, duree: d, emetteur: o.issuer || o.countryName, nom: [nature, d].filter(Boolean).join(", "), marche: marcheDe(o) };
}
