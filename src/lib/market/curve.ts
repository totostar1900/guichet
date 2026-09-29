import type { Country } from "@/lib/domain/types";
import { completerDepuisAvis, rembourseInFine, type EmissionLine } from "./emission-notices";
import { aUnPrixDExecution, completedAfterConfirmation, compteDansLesResultats, fourchette, thin, type AuctionResult } from "./auction-results";
import { auctionYield, tenorYears, vieRestante, yieldMissing, type AuctionYield } from "./yield";

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
  /**
   * L'abscisse : ce qu'il reste à courir, et non la durée d'origine.
   *
   * Une courbe des taux porte des rendements par maturité. Un abondement d'une
   * obligation à six ans qui n'a plus que dix-huit mois devant lui appartient au
   * court, quel que soit le nom de la ligne.
   */
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
  /** La fourchette publiée, quand le Trésor n'imprime pas de chiffre servi. */
  publie?: string;
  /**
   * Une phrase recopiée de la pièce, montrée telle quelle.
   *
   * « why » est une clef de dictionnaire ; ceci ne l'est pas. Les mots du
   * Trésor se citent dans sa langue, et les traduire leur ferait dire autre
   * chose.
   */
  cite?: string;
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

/**
 * L'abscisse mise en mots : un nombre et son unité, pas une phrase.
 *
 * Sous l'année, les mois se lisent mieux que les décimales : « 11 mois » dit ce
 * que « 0,9 an » oblige à convertir de tête. Au-delà, une décimale suffit, un
 * abondement se posant à 1,5 an et non à 1,54.
 */
export const horizon = (years: number): { n: number; unit: "mois" | "ans" } =>
  years < 1 ? { n: Math.max(1, Math.round(years * 12)), unit: "mois" } : { n: Math.round(years * 10) / 10, unit: "ans" };

/**
 * Le point ne se pose pas où son étiquette l'annonce : c'est un abondement.
 *
 * L'écart se mesure en proportion de la durée annoncée et non en mois, parce
 * que la même règle doit couvrir treize semaines et dix ans. Un dixième de la
 * durée : neuf jours sur un bon à treize semaines, quatre mois sur un dix ans.
 * Les arrondis de calendrier, eux, valent quelques jours et ne déclenchent
 * jamais rien.
 */
export function abonde(p: Pick<CurvePoint, "tenor" | "years">): boolean {
  const annonce = tenorYears(p.tenor);
  return annonce != null && Math.abs(annonce - p.years) > annonce * 0.1;
}

/** Sous deux points, une courbe n'est pas une courbe : c'est une observation. */
export const MIN_POINTS = 2;

export interface CurveOptions {
  /** Le jour d'observation. Par défaut, aujourd'hui. */
  on?: string;
  /** Au-delà, une séance ne dit plus le marché du jour. */
  windowDays?: number;
  /** Restreindre à un Trésor. */
  country?: Country;
  /**
   * Les modalités connues des lignes empruntées, tirées des avis d'annonce.
   *
   * Elles servent à deux choses : combler un coupon que le communiqué de
   * résultats n'imprime pas, et écarter une ligne dont l'échéancier n'est pas
   * celui que le calcul sait faire. Sans elles la courbe se construit comme
   * avant, en déclarant l'in fine comme une hypothèse.
   */
  lines?: EmissionLine[];
}

export function buildCurve(rows: AuctionResult[], opts: CurveOptions = {}): Curve {
  const on = opts.on ?? new Date().toISOString().slice(0, 10);
  const windowDays = opts.windowDays ?? 180;

  const fenetre = rows.filter((r) => {
    // Une pièce écartée n'est pas un résultat : ni relue, ni à relire, rangée.
    if (!compteDansLesResultats(r)) return false;
    if (!r.confirmedBy) return false;
    if (opts.country && r.country !== opts.country) return false;
    const age = days(on, r.sessionOn);
    return age >= 0 && age <= windowDays;
  });

  const gaps: CurveGap[] = [];
  const parCle = new Map<string, CurvePoint[]>();
  const lignes = opts.lines ?? [];
  for (const brut of fenetre) {
    /**
     * Un échéancier que le calcul ne sait pas faire n'est pas une hypothèse à
     * déclarer, c'est un point à ne pas tracer.
     *
     * Les six Trésors de la zone remboursent in fine, vérifié sur leurs avis,
     * et le jour où l'un d'eux amortira par tranches ce sera écrit là. Mieux
     * vaut alors un trou nommé sur la courbe qu'un rendement actualisé sur le
     * mauvais échéancier, qui ressemblerait à tous les autres.
     */
    const ligne = brut.codeEmission ? lignes.find((l) => l.codeEmission === brut.codeEmission!.trim()) : undefined;
    if (ligne && rembourseInFine(ligne.redemption) === false) {
      gaps.push({
        country: brut.country,
        instrument: brut.instrument,
        tenor: brut.tenor,
        on: brut.sessionOn,
        why: "l'avis d'annonce donne un autre échéancier : le calcul actualise un capital rendu en une fois",
        cite: ligne.redemption,
        id: brut.id,
      });
      continue;
    }

    /**
     * Une adjudication qui n'a rien servi n'a pas de prix d'exécution.
     *
     * Le Trésor a refusé ce qu'on lui demandait : soit personne n'a soumis,
     * soit les offres sont venues et il n'en a pris aucune. Le taux qui
     * subsiste parfois sur ces séances est le taux DEMANDÉ par le marché, et
     * le tracer publierait un prix que personne n'a accepté.
     *
     * La séance n'est pas écartée pour autant : c'est un vrai résultat, et
     * elle continue de compter dans la pression de la demande et dans
     * l'exécution du programme. Seul son point de courbe n'existe pas, et le
     * trou se nomme ici plutôt que de disparaître.
     */
    if (!aUnPrixDExecution(brut)) {
      gaps.push({
        country: brut.country,
        instrument: brut.instrument,
        tenor: brut.tenor,
        on: brut.sessionOn,
        why:
          brut.bid === 0
            ? "adjudication déserte : personne n'a soumis, il n'y a pas de prix"
            : "aucun titre servi : le Trésor a refusé les offres, il n'y a pas de prix d'exécution",
        id: brut.id,
      });
      continue;
    }

    // Ce que l'avis apporte ne remplace jamais ce que la séance porte : c'est le
    // communiqué de résultats qui fait foi sur sa propre séance.
    const comble = completerDepuisAvis(brut, lignes);
    const r = comble ? { ...brut, couponRate: comble.couponRate, maturityOn: comble.maturityOn } : brut;
    const vie = vieRestante(r);
    const annees = vie?.years;
    const y = auctionYield(r);
    if (!y || annees == null) {
      const f = fourchette(r);
      gaps.push({
        country: r.country,
        instrument: r.instrument,
        tenor: r.tenor,
        on: r.sessionOn,
        why: yieldMissing(r) ?? "rendement indisponible",
        // Ce que la séance publie tout de même : une fourchette n'est pas un
        // point, mais ce n'est pas rien, et le desk doit savoir qu'il ne
        // trouvera pas de chiffre servi sur la pièce.
        publie: f ? `${f.lo.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} – ${f.hi.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : undefined,
        id: r.id,
      });
      continue;
    }
    // Un chiffre venu de l'avis se déclare, comme tout ce qui n'est pas sur la
    // pièce qu'on regarde : le desk relit le communiqué de résultats à côté de
    // l'écran et ne doit pas y chercher en vain un coupon qui n'y est pas.
    const rendement = comble
      ? { ...y, assumptions: [...y.assumptions, { key: "coupon et échéance repris de l'avis d'annonce de la ligne {code}", params: { code: comble.depuis.codeEmission } }] }
      : y;
    const p: CurvePoint = { country: r.country, tenor: r.tenor, years: annees, yield: rendement, from: r, ageDays: days(on, r.sessionOn), thin: thin(r), toVerify: completedAfterConfirmation(r) };
    // L'échéance identifie la ligne ; l'étiquette ne la distingue pas, deux
    // abondements de deux lignes pouvant s'appeler « 6 ans » le même mois.
    const cle = `${r.country}|${r.maturityOn ?? r.tenor}`;
    parCle.set(cle, [...(parCle.get(cle) ?? []), p]);
  }

  // Une ligne, un point : le plus récent des représentatifs, sinon le plus récent.
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
 *
 * Le deuxième piège est l'horizon. L'appariement se faisait par étiquette, et
 * un « 3 ans » congolais à onze mois du terme contre un « 3 ans » camerounais à
 * trois ans pleins ne dit rien d'une signature. Les points s'apparient donc sur
 * la vie restante, à un quart d'année ou dix pour cent près, et le plus proche
 * gagne. L'étiquette sert encore à nommer la ligne, plus à la comparer.
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

/** Deux horizons comparables : un quart d'année, ou dix pour cent du plus court. */
export const spreadComparable = (a: number, b: number): boolean => Math.abs(a - b) <= Math.max(0.25, 0.1 * Math.min(a, b));

export function spreads(curve: Curve, a: Country, b: Country): Spread[] {
  const pa = curve.countries.find((c) => c.country === a)?.points ?? [];
  const pb = curve.countries.find((c) => c.country === b)?.points ?? [];
  const out: Spread[] = [];
  for (const x of pa) {
    const y = pb
      .filter((p) => spreadComparable(p.years, x.years))
      .sort((m, n) => Math.abs(m.years - x.years) - Math.abs(n.years - x.years))[0];
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
