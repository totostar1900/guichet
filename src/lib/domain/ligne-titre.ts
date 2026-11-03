import { fmt, fmtPct, fmtPrice } from "@/lib/format";
import type { Offer } from "./types";

/**
 * LE COURS EN TÊTE, LES REVENUS DESSOUS (2 novembre 2026).
 *
 * Une ligne de titre mettait en tête le rendement et reléguait le cours dans un libellé.
 * Le cours est ce qu'on regarde d'abord : il passe en tête, avec sa variation collée ;
 * le dividende et le rendement (ou le coupon et le rendement pour une obligation)
 * s'écrivent dessous, abrégés. L'unité (« FCFA ») est écrite en petit : le nombre est
 * ce qu'on lit. Sans cours connu, la ligne garde son ancienne forme.
 */
export function coursEtRevenus(o: Offer, rendement: string, t: (k: string) => string): { cours?: { texte: string; unite?: string }; revenus?: { etiquette: string; texte: string; unite?: string }[] } {
  const estObligation = o.instrument === "obligation";
  const prix = o.lastPrice ?? (estObligation ? undefined : o.pricePerShare);
  if (prix == null) return {};
  const revenus: NonNullable<ReturnType<typeof coursEtRevenus>["revenus"]> = [];
  if (estObligation) {
    if (o.couponRate) revenus.push({ etiquette: t("Coupon"), texte: fmtPct(o.couponRate, 2) });
  } else if (o.dividendPerShare) revenus.push({ etiquette: t("Div."), texte: fmt(o.dividendPerShare), unite: "FCFA" });
  if (rendement && rendement !== "—") revenus.push({ etiquette: t("Rdt"), texte: rendement });
  return { cours: estObligation ? { texte: fmtPrice(prix), unite: t("du nominal") } : { texte: fmt(prix), unite: "FCFA" }, revenus };
}


/**
 * LA SOUS-LIGNE D'UNE LIGNE, COURTE (2 novembre 2026) : pour un fonds, la société de gestion seule.
 *
 * « Corridor Asset Management · LCB Bank » se coupait en « … LCB B… » dans la colonne : le
 * dépositaire ne s'affiche plus dans les blocs de l'Accueil. Il reste à la fiche, où l'on vérifie
 * qui garde les avoirs.
 */
export const sousLigne = (o: Pick<Offer, "kind" | "issuer">, sousTitre: string): string => (o.kind === "FONDS" ? o.issuer : sousTitre);
