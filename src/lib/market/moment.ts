import type { Offer } from "@/lib/domain/types";
import { seancesOuvertes, seancesPrevues } from "@/lib/domain/accueil";
import type { IndexPageData } from "./index-data";

/**
 * CE QUI SE PASSE SUR LA PLACE, À L'OUVERTURE DE LA PAGE (7 novembre 2026, planche « Notes de marché », 4A).
 *
 * La note garde sa date ; ce bandeau, lui, se calcule à chaque visite, des mêmes données que l'accueil : la dernière séance lue de l'indice, ce qui s'est échangé sur les cinq
 * dernières séances, et la prochaine adjudication d'un Trésor. Rien ne se lit en plus de ce qui est déjà lu. Le PDF d'une note ne porte pas ce bandeau : il garde sa date.
 */
export interface MomentDeLaPlace {
  derniereSeance?: { date: string; niveau: number; variationPct: number };
  /** Les cinq dernières séances lues. */
  semaine: { seances: number; transactions: number; montant: number; titres: number };
  prochaineAdjudication?: { id: string; titre: string; pays: string; clotureLe: string; ouverte: boolean };
}

export function momentDeLaPlace(d: IndexPageData, offers: Offer[], now = new Date()): MomentDeLaPlace {
  const pts = d.stats.points;
  const last = pts[pts.length - 1];
  const cinq = pts.slice(-5);
  const semaine = { seances: cinq.length, transactions: 0, montant: 0, titres: 0 };
  for (const p of cinq) {
    const s = d.trading.get(p.date);
    if (!s) continue;
    semaine.transactions += s.trades;
    semaine.montant += s.amount;
    semaine.titres += s.titles;
  }
  const ouvertes = seancesOuvertes(offers, now);
  const prevues = seancesPrevues(offers, now, 1);
  const o = ouvertes[0] ?? prevues[0];
  return {
    derniereSeance: last ? { date: last.date, niveau: last.value, variationPct: last.variationPct ?? 0 } : undefined,
    semaine,
    prochaineAdjudication: o ? { id: o.id, titre: o.title, pays: o.country, clotureLe: o.deadlineAt.slice(0, 10), ouverte: ouvertes.length > 0 } : undefined,
  };
}
