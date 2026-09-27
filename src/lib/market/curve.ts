import type { Country } from "@/lib/domain/types";
import { completedAfterConfirmation, thin, type AuctionResult } from "./auction-results";
import { auctionYield, tenorYears, yieldMissing, type AuctionYield } from "./yield";

/**
 * La courbe des taux de la zone, construite sur ce qui est relu.
 *
 * Une courbe souveraine n'est pas un dessin : c'est une affirmation sur le
 * coût de l'argent à chaque horizon, et six États de la CEMAC empruntent au
 * même guichet sans que personne ne publie leurs courbes côte à côte. C'est la
 * seule chose que ce fichier fabrique, et il la fabrique sous quatre règles
 * qui décident de ce qu'on n'affiche pas.
 *
 *   Seules les séances relues entrent. Une lecture automatique peut porter un
 *   7,00 % lu de travers sur un scan ; devenue point de courbe, elle se
 *   propagerait à toutes les indications du desk.
 *
 *   Une durée, un point, le plus récent. Deux séances de la même durée à
 *   quinze jours d'écart ne se moyennent pas : la plus récente est le marché,
 *   l'autre est de l'histoire, et l'histoire se lit dans une série, pas dans
 *   une courbe.
 *
 *   Une séance représentative passe devant une séance récente. Un bon servi à
 *   un seul soumissionnaire dit ce que cette contrepartie voulait, pas ce que
 *   le marché demandait.
 *
 *   Rien ne se moyenne entre deux pays. L'écart entre deux signatures est
 *   exactement ce que la courbe sert à lire ; le fondre serait effacer le
 *   sujet.
 *
 * Et une règle de silence : ce qui manque se compte et se nomme. Une
 * obligation sans coupon n'est pas un point manquant sans raison, c'est une
 * consigne de relecture, et l'écran la porte.
 */

export interface CurvePoint {
  country: Country;
  tenor: string;
  /** L'abscisse : la durée en années. */
  years: number;
  yield: AuctionYield;
  from: AuctionResult;
  /** L'âge de la séance au jour d'observation. Une courbe ne vaut pas mieux que son point le plus vieux. */
  ageDays: number;
  /** La séance est mince : le point est tracé, et signalé. */
  thin: boolean;
  /**
   * Un champ est arrivé après la confirmation : le plus souvent le coupon,
   * relevé par le robot une fois la colonne créée. Le point compte, et la
   * personne qui a confirmé la séance ne l'a pas vu passer.
   */
  toVerify: boolean;
}

export interface CountryCurve {
  country: Country;
  points: CurvePoint[];
  /** Le point le plus ancien retenu. */
  oldestDays: number;
  /** La séance la plus récente de la courbe. */
  latest: string;
}

/** Une séance relue qui aurait dû donner un point, et ce qui l'en a empêchée. */
export interface CurveGap {
  country: Country;
  instrument: AuctionResult["instrument"];
  tenor: string;
  on: string;
  why: string;
  id: string;
}

export interface Curve {
  on: string;
  windowDays: number;
  countries: CountryCurve[];
  gaps: CurveGap[];
  /** Combien de séances relues la fenêtre contenait, avant tout tri. */
  considered: number;
}

const days = (a: string, b: string): number => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

/** Sous deux points, une courbe n'est pas une courbe : c'est une observation. */
export const MIN_POINTS = 2;

export interface CurveOptions {
  /** Le jour d'observation. Par défaut, aujourd'hui. */
  on?: string;
  /** Au-delà, une séance ne dit plus le marché du jour. */
  windowDays?: number;
  /** Restreindre à un Trésor. */
  country?: Country;
}

export function buildCurve(rows: AuctionResult[], opts: CurveOptions = {}): Curve {
  const on = opts.on ?? new Date().toISOString().slice(0, 10);
  const windowDays = opts.windowDays ?? 180;

  const fenetre = rows.filter((r) => {
    if (!r.confirmedBy) return false;
    if (opts.country && r.country !== opts.country) return false;
    const age = days(on, r.sessionOn);
    return age >= 0 && age <= windowDays;
  });

  const gaps: CurveGap[] = [];
  const parCle = new Map<string, CurvePoint[]>();
  for (const r of fenetre) {
    const annees = tenorYears(r.tenor);
    const y = auctionYield(r);
    if (!y || annees == null) {
      gaps.push({ country: r.country, instrument: r.instrument, tenor: r.tenor, on: r.sessionOn, why: yieldMissing(r) ?? "rendement indisponible", id: r.id });
      continue;
    }
    const p: CurvePoint = { country: r.country, tenor: r.tenor, years: annees, yield: y, from: r, ageDays: days(on, r.sessionOn), thin: thin(r), toVerify: completedAfterConfirmation(r) };
    const cle = `${r.country}|${r.tenor}`;
    parCle.set(cle, [...(parCle.get(cle) ?? []), p]);
  }

  // Une durée, un point : le plus récent des représentatifs, sinon le plus récent.
  const retenus: CurvePoint[] = [];
  for (const groupe of parCle.values()) {
    const tri = [...groupe].sort((a, b) => b.from.sessionOn.localeCompare(a.from.sessionOn));
    retenus.push(tri.find((p) => !p.thin) ?? tri[0]);
  }

  const parPays = new Map<Country, CurvePoint[]>();
  for (const p of retenus) parPays.set(p.country, [...(parPays.get(p.country) ?? []), p]);

  const countries: CountryCurve[] = [...parPays.entries()]
    .map(([country, pts]) => {
      const points = [...pts].sort((a, b) => a.years - b.years);
      return {
        country,
        points,
        oldestDays: Math.max(...points.map((p) => p.ageDays)),
        latest: points.map((p) => p.from.sessionOn).sort().at(-1)!,
      };
    })
    .sort((a, b) => b.points.length - a.points.length || a.country.localeCompare(b.country));

  return { on, windowDays, countries, gaps: gaps.sort((a, b) => b.on.localeCompare(a.on)), considered: fenetre.length };
}

/**
 * L'écart entre deux Trésors à durée égale, et ce qu'il vaut.
 *
 * Le chiffre est trivial à soustraire, et c'est bien le piège : deux séances
 * distantes de six semaines donnent un écart qui n'est pas un écart de crédit
 * mais un écart de date. L'écart porte donc toujours le nombre de jours qui
 * sépare les deux séances, et l'écran refuse de le présenter comme une mesure
 * au-delà d'un mois.
 */
export interface Spread {
  tenor: string;
  years: number;
  a: CurvePoint;
  b: CurvePoint;
  /** En points de base, a moins b. */
  bp: number;
  /** Jours entre les deux séances : au-delà de trente, l'écart est daté, pas mesuré. */
  apart: number;
}

export const SPREAD_COMPARABLE_DAYS = 30;

export function spreads(curve: Curve, a: Country, b: Country): Spread[] {
  const pa = curve.countries.find((c) => c.country === a)?.points ?? [];
  const pb = curve.countries.find((c) => c.country === b)?.points ?? [];
  const out: Spread[] = [];
  for (const x of pa) {
    const y = pb.find((p) => p.tenor === x.tenor);
    if (!y) continue;
    out.push({
      tenor: x.tenor,
      years: x.years,
      a: x,
      b: y,
      bp: Math.round((x.yield.pct - y.yield.pct) * 100),
      apart: Math.abs(days(x.from.sessionOn, y.from.sessionOn)),
    });
  }
  return out.sort((m, n) => m.years - n.years);
}

/**
 * La série d'une durée dans le temps : l'autre lecture, celle qui date les
 * retournements. La courbe dit le marché d'un jour, la série dit son histoire.
 */
export interface SeriePoint {
  on: string;
  pct: number;
  origin: AuctionYield["origin"];
  thin: boolean;
  id: string;
}

export function serie(rows: AuctionResult[], country: Country, tenor: string): SeriePoint[] {
  return rows
    .filter((r) => r.confirmedBy && r.country === country && r.tenor === tenor)
    .map((r) => {
      const y = auctionYield(r);
      return y ? { on: r.sessionOn, pct: y.pct, origin: y.origin, thin: thin(r), id: r.id } : undefined;
    })
    .filter((p): p is SeriePoint => Boolean(p))
    .sort((a, b) => a.on.localeCompare(b.on));
}
