import type { Offer, Country } from "@/lib/domain/types";
import type { AuctionResult } from "@/lib/market/auction-results";
import { compteDansLesResultats } from "@/lib/market/auction-results";
import { displayYield } from "@/lib/domain/status";
import { daysBetween } from "@/lib/finance";
import {
  ajouteJours,
  borner,
  bonRoule,
  fenetreCommune,
  mesureSurPoints,
  sensibiliteBonRoule,
  sensibiliteSurPoints,
  STRATEGIES_BONS,
  type Couverture,
  type Mesure,
  type Point,
  type SensibiliteEntree,
  type SeanceBon,
} from "@/lib/domain/comparaison";

/**
 * LE MODE « SUR UNE PÉRIODE PASSÉE » : TOUT CE QUE LA PAGE AFFICHE, CALCULÉ ICI (7 novembre 2026).
 *
 * Le dépôt est lu par l'appelant ; cette fonction ne fait que décider de ce qui se mesure, sur quelle plage, et ce qui est « non mesurable » et pourquoi.
 * L'OTA n'est jamais mesuré sur une période : sans sortie anticipée (marché secondaire peu liquide), son rendement est son rendement actuariel à l'échéance.
 */
export interface EntreesPeriode {
  lignes: Offer[];
  navs: Map<string, Point[]>;
  cours: Map<string, Point[]>;
  seances: AuctionResult[];
  du?: string;
  au?: string;
  tauxBancairePct: number;
  tresor?: string;
  capital: number;
}

export type Genre = "fonds" | "cote" | "bon" | "ota" | "autre";

export interface Resultat {
  id: string;
  titre: string;
  genre: Genre;
  /** Clef de traduction de ce que le chiffre est. */
  nature: string;
  mesure?: Mesure & { placements?: number; joursSansPlacement?: number };
  /** Pourquoi la ligne n'est pas mesurée sur la période. */
  hors?: string;
  /** Le rendement actuariel d'un OTA : tenu jusqu'à l'échéance, jamais calculé sur la période. */
  actuariel?: number;
  couverture?: Couverture;
}

export interface Strategie {
  id: string;
  /** « BTA 13 sem. roulé » : clef de traduction + durée. */
  semaines: number;
  uneFois: boolean;
  mesure?: Mesure & { placements?: number; joursSansPlacement?: number };
  gain?: number;
}

export interface Periode {
  resultats: Resultat[];
  commune?: Couverture;
  fenetre?: { du: string; au: string; borne: boolean; jours: number };
  strategies: Strategie[];
  tresor: string;
  entree: { duree: number; lignes: { id: string; titre: string; s?: SensibiliteEntree }[] };
  tauxBancairePct: number;
  /** Les raccourcis : du, au. */
  raccourcis: { id: string; du: string; au: string }[];
}

const SEMAINES = [13, 26, 52];
const TOL_FONDS = 35;
const TOL_COURS = 10;

export const semainesDuBon = (o: Pick<Offer, "settleOn" | "maturityOn">): number | undefined => {
  if (!o.maturityOn || !o.settleOn) return undefined;
  const sem = Math.round(daysBetween(o.settleOn, o.maturityOn) / 7);
  const proche = SEMAINES.reduce((a, b) => (Math.abs(b - sem) < Math.abs(a - sem) ? b : a));
  return Math.abs(proche - sem) <= 3 ? proche : undefined;
};

const seancesBon = (res: AuctionResult[], pays?: string): SeanceBon[] =>
  res
    .filter((r) => r.instrument === "BTA" && compteDansLesResultats(r) && r.confirmedBy && (!pays || r.country === pays) && (r.served ?? 0) > 0 && (r.rateAvg ?? r.rateLimit) != null)
    .map((r) => ({ date: r.sessionOn, tauxPct: (r.rateAvg ?? r.rateLimit) as number, semaines: Math.round(parseInt(r.tenor, 10)) }))
    .filter((s) => SEMAINES.includes(s.semaines));

const couvrir = (pts: Point[]): Couverture | undefined => (pts.length > 1 ? { debut: pts[0].date, fin: pts[pts.length - 1].date } : undefined);

export function preparerPeriode(e: EntreesPeriode): Periode {
  const paysDesBons = e.lignes.find((o) => o.kind === "BTA" || o.kind === "OTA")?.country as Country | undefined;
  const tresor = e.tresor ?? paysDesBons ?? "Cameroun";
  const seancesTresor = seancesBon(e.seances, tresor);

  const resultats: Resultat[] = [];
  const mesurables: { id: string; couverture: Couverture; mesurer: (du: string, au: string) => Resultat["mesure"]; sensib: (du: string, au: string, d: number) => SensibiliteEntree | undefined }[] = [];

  for (const o of e.lignes) {
    const base = { id: o.id, titre: o.title };
    if (o.kind === "FONDS" && o.fund) {
      const pts = e.navs.get(o.fund.key) ?? [];
      const cov = couvrir(pts);
      resultats.push({ ...base, genre: "fonds", nature: "valeur liquidative", couverture: cov, hors: cov ? undefined : "pas assez de valeurs liquidatives lues" });
      if (cov) mesurables.push({ id: o.id, couverture: cov, mesurer: (du, au) => mesureSurPoints(pts, du, au, TOL_FONDS), sensib: (du, au, d) => sensibiliteSurPoints(pts, du, au, d, TOL_FONDS) });
    } else if (o.kind === "MARCHE" && o.isin) {
      const pts = e.cours.get(o.isin) ?? [];
      const cov = couvrir(pts);
      resultats.push({ ...base, genre: "cote", nature: "cours, dividendes et coupons non compris", couverture: cov, hors: cov ? undefined : "pas assez de séances lues" });
      if (cov) mesurables.push({ id: o.id, couverture: cov, mesurer: (du, au) => mesureSurPoints(pts, du, au, TOL_COURS), sensib: (du, au, d) => sensibiliteSurPoints(pts, du, au, d, TOL_COURS) });
    } else if (o.kind === "BTA") {
      const sem = semainesDuBon(o);
      const propres = sem ? seancesBon(e.seances, o.country) : [];
      const dates = propres.filter((s) => s.semaines === sem).map((s) => s.date).sort();
      if (sem && dates.length > 1) {
        const cov = { debut: dates[0], fin: dates[dates.length - 1] };
        resultats.push({ ...base, genre: "bon", nature: "bon roulé jusqu'à l'échéance, au taux moyen pondéré", couverture: cov });
        mesurables.push({
          id: o.id,
          couverture: cov,
          mesurer: (du, au) => bonRoule(propres, sem, du, au, e.tauxBancairePct),
          sensib: (du, au, d) => sensibiliteBonRoule(propres, sem, du, au, d, e.tauxBancairePct),
        });
      } else resultats.push({ ...base, genre: "bon", nature: "bon roulé jusqu'à l'échéance, au taux moyen pondéré", hors: sem ? "pas assez de séances d'adjudication lues pour cette durée" : "durée hors 13, 26 et 52 semaines" });
    } else if (o.kind === "OTA") {
      resultats.push({ ...base, genre: "ota", nature: "rendement actuariel, tenu jusqu'à l'échéance", hors: "pas de sortie anticipée : le marché secondaire est peu liquide", actuariel: displayYield(o).pct ?? undefined });
    } else {
      resultats.push({ ...base, genre: "autre", nature: "sans historique", hors: "ligne d'émission ou de rachat : aucun historique de prix" });
    }
  }

  const commune = fenetreCommune(mesurables.map((m) => m.couverture));
  const fenetre = commune ? borner({ du: e.du, au: e.au }, commune) : undefined;
  const jours = fenetre ? daysBetween(fenetre.du, fenetre.au) : 0;

  if (fenetre) for (const r of resultats) {
    const m = mesurables.find((x) => x.id === r.id);
    if (m) r.mesure = m.mesurer(fenetre.du, fenetre.au);
    if (m && !r.mesure) r.hors = "aucune valeur utilisable aux deux bouts de la période";
  }

  const strategies: Strategie[] = STRATEGIES_BONS.map((s) => {
    const mesure = fenetre && jours > 0 ? bonRoule(seancesTresor, s.semaines, fenetre.du, fenetre.au, e.tauxBancairePct, s.uneFois) : undefined;
    return { id: s.id, semaines: s.semaines, uneFois: s.uneFois, mesure, gain: mesure ? (e.capital * mesure.cumule) / 100 : undefined };
  });

  const duree = Math.max(30, Math.min(182, Math.floor(jours / 2)));
  const entree = {
    duree,
    lignes: e.lignes.map((o) => ({ id: o.id, titre: o.title, s: fenetre && jours >= 60 ? mesurables.find((m) => m.id === o.id)?.sensib(fenetre.du, fenetre.au, duree) : undefined })),
  };

  const fin = commune?.fin;
  const mois = (n: number) => (fin ? ajouteJours(fin, -Math.round(n * 30.4375)) : "");
  const raccourcis = commune && fin
    ? [
        { id: "m3", du: mois(3), au: fin },
        { id: "m6", du: mois(6), au: fin },
        { id: "a1", du: mois(12), au: fin },
        { id: "a2", du: mois(24), au: fin },
        { id: "tout", du: commune.debut, au: fin },
      ].filter((c) => c.du >= commune.debut)
    : [];

  return { resultats, commune, fenetre: fenetre ? { ...fenetre, jours } : undefined, strategies, tresor, entree, tauxBancairePct: e.tauxBancairePct, raccourcis };
}
