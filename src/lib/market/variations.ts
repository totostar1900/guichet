import "server-only";
import { variationDe, type VariationDeLigne } from "@/lib/domain/accueil";
import { performanceSur } from "@/lib/market/performe";
import type { Offer } from "@/lib/domain/types";
import { fmtDate } from "@/lib/format";

type Dire = (cle: string, params?: Record<string, string>) => string;

/**
 * LA VARIATION D'UNE ACTION EST CELLE DES TROIS DERNIERS MOIS, PARTOUT (7 novembre 2026).
 *
 * L'Accueil la comptait du dernier échange au précédent (parfois à une semaine d'écart), la page Titres sur trois mois : deux chiffres différents pour la
 * même action, sous le même mot. Une seule définition, celle de « Ce qui performe » (`performanceSur`, hors dividendes, une requête pour toute la cote) :
 * l'Accueil, la fiche et le comparateur la lisent ici. Une ligne qui n'est pas une action, ou que la fenêtre ne couvre pas, n'a pas d'entrée.
 */
export async function variationsDesActions(offers: Offer[]): Promise<Map<string, VariationDeLigne>> {
  const lignes = offers.filter((o) => (o.kind === "MARCHE" || o.kind === "ACTIONS") && o.isin);
  if (!lignes.length) return new Map();
  const classement = await performanceSur().catch(() => undefined);
  if (!classement) return new Map();
  const parIsin = new Map(classement.lignes.map((l) => [l.isin, l] as const));
  return new Map(
    lignes.flatMap((o) => {
      const l = parIsin.get(o.isin);
      return l ? [[o.id, { pct: l.variationPct, depuis: l.depuis, le: classement.jusquAu } as VariationDeLigne] as const] : [];
    }),
  );
}

/** La variation sur trois mois d'UNE action (fiche, comparateur), ou rien. */
export async function variationTroisMois(isin: string): Promise<VariationDeLigne | undefined> {
  if (!isin) return undefined;
  const classement = await performanceSur().catch(() => undefined);
  const l = classement?.lignes.find((x) => x.isin === isin);
  return l && classement ? { pct: l.variationPct, depuis: l.depuis, le: classement.jusquAu } : undefined;
}

/** Ce que la pastille d'une ligne dit, et son infobulle : la variation de la VL d'un fonds, ou celle d'une action sur trois mois. */
export function variationAffichee(o: Offer, actions: Map<string, VariationDeLigne>, t: Dire): { v: number; titre: string; periode?: string } | undefined {
  const fonds = variationDe(o);
  if (fonds !== undefined) return { v: fonds, titre: t("Variation de la dernière valeur liquidative") };
  const a = actions.get(o.id);
  return a ? { v: a.pct, periode: t("3 mois"), titre: t("Variation du cours sur trois mois, depuis le {d}", { d: fmtDate(a.depuis, false) }) } : undefined;
}
