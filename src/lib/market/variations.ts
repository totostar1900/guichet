import "server-only";
import { repo } from "@/lib/data";
import { variationDe, variationDesDerniersEchanges, type VariationDeLigne } from "@/lib/domain/accueil";
import type { Offer } from "@/lib/domain/types";
import { fmtDate } from "@/lib/format";

type Dire = (cle: string, params?: Record<string, string>) => string;

/**
 * LES VARIATIONS DES ACTIONS QUE L'ACCUEIL MONTRE (2 novembre 2026).
 *
 * Une lecture ciblée par action, en parallèle (une dizaine de millisecondes pour six
 * lignes, mesurée sur la base le même jour) : jamais la vue entière des dernières
 * cotations, qui parcourt tout l'historique. Une ligne qui n'est pas une action,
 * ou que la base ne sait pas lire, n'a pas d'entrée.
 */
export async function variationsDesActions(offers: Offer[]): Promise<Map<string, VariationDeLigne>> {
  /* UNE LIGNE COTÉE EST « MARCHE », actions et obligations mêlées : c'est la cotation
     qui dit ce qu'elle est (« instrument »), pas l'offre. Les obligations n'ont jamais
     traité et n'ont donc pas de variation ; leur lecture coûte un parcours d'index. */
  const lignes = [...new Map(offers.filter((o) => (o.kind === "MARCHE" || o.kind === "ACTIONS") && o.isin).map((o) => [o.isin, o])).values()];
  const lues = await Promise.all(
    lignes.map(async (o) => {
      const q = await repo().listQuotes(o.isin, 60).catch(() => []);
      return [o.id, q[0]?.instrument === "action" ? variationDesDerniersEchanges(q) : undefined] as const;
    }),
  );
  return new Map(lues.flatMap(([id, v]) => (v ? [[id, v] as const] : [])));
}

/** Ce que la pastille d'une ligne dit, et son infobulle : la variation de la VL d'un fonds, ou celle d'une action entre deux échanges. */
export function variationAffichee(o: Offer, actions: Map<string, VariationDeLigne>, t: Dire): { v: number; titre: string } | undefined {
  const fonds = variationDe(o);
  if (fonds !== undefined) return { v: fonds, titre: t("Variation de la dernière valeur liquidative") };
  const a = actions.get(o.id);
  return a ? { v: a.pct, titre: t("Variation depuis l'échange du {d}", { d: fmtDate(a.depuis, false) }) } : undefined;
}
