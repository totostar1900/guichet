import { fmtDate, fmtPct } from "@/lib/format";
import { tenorCourt } from "@/lib/finance";
import { CODE_PAYS } from "./carte-compacte";
import { motDuNiveau, rendementDeLaLigne } from "./sondage";
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
 * LES LIMITES D'UNE LIGNE SONDÉE, TELLES QUE LA PAGE DU SONDAGE LES DÉFINIT (2 novembre 2026).
 *
 * Le client y pose un PLANCHER de niveau — « coupon min. » sur une OTA, « taux min. » sur un bon — et,
 * sur une OTA, un « prix max. », tel qu'il l'a saisi — un plafond, car un acheteur plafonne ce qu'il paie (le dirigeant a tranché le 3 novembre 2026 : « prix max partout »). Le rendement
 * qui en découle (`rendementDeLaLigne`) n'est qu'un équivalent, écrit en gris à côté du prix. Pas de mot
 * vide à la place d'un chiffre absent (« taux — » était un mot sans chiffre) : une limite non fixée
 * ne s'écrit pas.
 */
export function limitesDeSondage(l: Pick<LigneSondee, "instrument" | "tenor" | "rate" | "pricePct" | "seanceLe" | "dansJours" | "createdAt">): { niveau?: { mot: "coupon" | "taux"; valeur: string }; prix?: { valeur: string }; rendement?: { valeur: string } } {
  const r = rendementDeLaLigne(l);
  return {
    ...(l.rate != null ? { niveau: { mot: motDuNiveau(l.instrument), valeur: fmtPct(l.rate, 2) } } : {}),
    ...(l.instrument === "OTA" && l.pricePct != null ? { prix: { valeur: fmtPct(l.pricePct, Number.isInteger(l.pricePct) ? 0 : 2) } } : {}),
    ...(r != null ? { rendement: { valeur: fmtPct(r, 2) } } : {}),
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
