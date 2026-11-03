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
 *
 * DEUX EMPLACEMENTS, TOUJOURS ÉCRITS (2 novembre 2026) : une limite que le client n'a pas fixée se
 * lit « taux — » ou « prix — », pas par son absence. Un bon (BTA) se vend précompté : il n'a pas
 * de prix, donc pas d'emplacement « prix ». `valeur` absente = limite non fixée.
 */
export function limitesDeSondage(l: Pick<LigneSondee, "instrument" | "rate" | "pricePct">): { taux: { valeur?: string }; prix?: { valeur?: string } } {
  return {
    taux: { valeur: l.rate != null ? fmtPct(l.rate, 1) : undefined },
    ...(l.instrument === "OTA" ? { prix: { valeur: l.pricePct != null ? fmtPrice(l.pricePct) : undefined } } : {}),
  };
}

/**
 * LA PÉRIODE D'UNE PERFORMANCE, SUR UNE LIGNE, EN ABRÉGÉ : « 18 sept. 25 – 16 oct. 26 ».
 *
 * Un chiffre sans sa période se lit comme celui du jour. La fin n'est PAS aujourd'hui : c'est la
 * dernière VL que le gestionnaire a publiée, et pour certains fonds elle a trois semaines. Seule
 * la performance sur douze mois d'un fonds porte une date de départ (`perf1yFrom`) ; sans elle,
 * pas de période inventée. Les années sont à deux chiffres : la ligne tient sur 390 px.
 */
const court = (iso: string): string => fmtDate(iso).replace(/ (\d{2})(\d{2})$/, " $2");
export function periodeDeFonds(f: Pick<FundTerms, "perf1yPct" | "perf1yFrom" | "navDate">): { a: string; b: string } | undefined {
  if (f.perf1yPct == null || !f.perf1yFrom) return undefined;
  return { a: court(f.perf1yFrom), b: court(f.navDate) };
}
