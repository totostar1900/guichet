import type { Offer } from "./types";
import type { Quote } from "./market";

/**
 * LE DERNIER PRIX D'UNE LIGNE COTÉE EST SA DERNIÈRE CLÔTURE (6 novembre 2026).
 *
 * En production, l'ingestion écrit la clôture dans « lastPrice » ; dans le jeu de démonstration, la ligne vient d'un relevé et la cote d'une série calculée :
 * la liste des Titres disait 90 000 quand la fiche disait 97 000. Le dépôt mémoire recopie donc, à la création du magasin, la dernière clôture de la cote sur
 * chaque ligne de la BVMAC qui en a une. Une ligne sans cote garde son prix ; les offres primaires (tranches d'IPO) ne sont pas touchées.
 */
export function alignerSurLaCloture(offers: Offer[], quotes: Quote[]): void {
  const dernieres = new Map<string, Quote>();
  for (const q of quotes) {
    const d = dernieres.get(q.isin);
    if (!d || q.sessionDate > d.sessionDate) dernieres.set(q.isin, q);
  }
  for (const o of offers) {
    if (o.market !== "BVMAC" || o.instrument !== "action" || !o.isin) continue;
    const q = dernieres.get(o.isin);
    if (!q) continue;
    o.lastPrice = q.close;
    o.lastPriceOn = q.sessionDate;
  }
}
