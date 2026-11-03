import { fmtDate, fmtPct, fmtPrice } from "@/lib/format";
import { tenorCourt } from "@/lib/finance";
import { CODE_PAYS } from "./carte-compacte";
import type { FundTerms, LigneSondee, Offer } from "./types";

/**
 * LE GABARIT DE LA MAISON POUR UNE LIGNE QUI SE DEMANDE : « OTA 4 ans • CMR » (2 novembre 2026).
 *
 * Le sondage l'a posé le 26 octobre 2026 (« OTA • CMR • 5 ans • … ») : l'instrument, la
 * durée, le pays abrégé, et les chiffres dessous. L'Accueil l'adopte pour « Mes
 * intentions » et « Mes intentions au sondage », au lieu du nom entier de la ligne et du
 * pays en toutes lettres. « CMR » est `CODE_PAYS`, le même code que les cartes.
 */
export function gabaritDeSondage(l: Pick<LigneSondee, "instrument" | "tenor" | "country">): string {
  return `${l.instrument} ${l.tenor} • ${CODE_PAYS[l.country] ?? l.country}`;
}

/**
 * Le gabarit d'une intention sur une ligne du Trésor (OTA ou BTA) ; absent pour tout le
 * reste (un fonds, une action) : leur nom est déjà court, et le gabarit ne dirait pas de
 * quelle ligne il s'agit.
 */
export function gabaritDIntention(o: Pick<Offer, "kind" | "country" | "settleOn" | "maturityOn">): string | undefined {
  if ((o.kind !== "OTA" && o.kind !== "BTA") || !o.maturityOn || !o.settleOn) return undefined;
  return `${o.kind} ${tenorCourt(o.settleOn, o.maturityOn)} • ${CODE_PAYS[o.country] ?? o.country}`;
}

/**
 * LES LIMITES D'UNE LIGNE SONDÉE, DANS LE LANGAGE DE LA MAISON : un taux MINIMUM, un prix MAXIMUM.
 *
 * Un acheteur veut au moins tel coupon et ne paie pas plus que tel prix (`checks.ts` : « Taux
 * minimum … », « Prix maximum … »). « 95 % min » aurait dit l'inverse du prix d'un acheteur.
 */
export function limitesDeSondage(l: Pick<LigneSondee, "rate" | "pricePct">): { taux?: string; prix?: string } {
  return {
    ...(l.rate != null ? { taux: `${fmtPct(l.rate, 1)} min` } : {}),
    ...(l.pricePct != null ? { prix: `${fmtPrice(l.pricePct)} max` } : {}),
  };
}

/**
 * LA PÉRIODE D'UNE PERFORMANCE, AVEC SES DEUX DATES : de la VL d'il y a un an à la dernière VL.
 *
 * Un chiffre sans sa période se lit comme celui du jour. Seule la performance sur douze mois
 * d'un fonds porte une date de départ (`perf1yFrom`) ; sans elle, pas de période inventée.
 * La page écrit la phrase (« du {a} au {b} ») : ce module ne traduit rien.
 */
export function periodeDeFonds(f: Pick<FundTerms, "perf1yPct" | "perf1yFrom" | "navDate">): { a: string; b: string } | undefined {
  if (f.perf1yPct == null || !f.perf1yFrom) return undefined;
  return { a: fmtDate(f.perf1yFrom), b: fmtDate(f.navDate) };
}
