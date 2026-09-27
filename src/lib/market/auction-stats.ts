import type { Country } from "@/lib/domain/types";
import { coverageOf, type AuctionResult } from "./auction-results";

/**
 * Ce que la série des séances dit du marché primaire.
 *
 * Trois mesures, et elles se lisent ensemble ou pas du tout.
 *
 *   La couverture : ce qui a été soumis rapporté à ce qui était annoncé. Au
 *   dessus de un, le Trésor choisit ; en dessous, il subit.
 *
 *   La part servie du soumis : ce que le Trésor a retenu de ce qu'on lui a
 *   proposé. Elle dit la même chose dans l'autre sens, et c'est pourquoi elle
 *   compte : une couverture qui baisse pendant que la part servie monte vers
 *   cent pour cent ne laisse aucune place à l'interprétation.
 *
 *   Le nombre de soumissionnaires : la largeur du marché. Deux banques qui
 *   posent un prix ne font pas un marché, quel que soit le montant.
 *
 * Aucune de ces mesures ne vaut sur une séance seule. Elles se moyennent par
 * année, et l'année porte son compte de séances : trois séances relues ne
 * fondent pas une moyenne, et l'écran doit le montrer avant qu'on en tire une
 * phrase.
 */

export interface PressureYear {
  year: string;
  /** Séances retenues : celles qui portent un montant annoncé et un montant soumis. */
  n: number;
  /** Couverture moyenne, en multiple de l'annoncé. */
  coverage: number;
  /** Part servie du soumis, en %. */
  allotment: number | null;
  /** Soumissionnaires par séance. */
  bidders: number | null;
}

const moy = (v: number[]): number | null => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

export function pressureByYear(rows: AuctionResult[]): PressureYear[] {
  const parAn = new Map<string, AuctionResult[]>();
  for (const r of rows) {
    if (!r.announced || r.bid == null) continue;
    const an = r.sessionOn.slice(0, 4);
    parAn.set(an, [...(parAn.get(an) ?? []), r]);
  }
  return [...parAn.entries()]
    .map(([year, lot]) => ({
      year,
      n: lot.length,
      coverage: moy(lot.map((r) => (coverageOf(r) ?? 0) / 100))!,
      allotment: moy(lot.filter((r) => r.served != null && r.bid).map((r) => (r.served! / r.bid!) * 100)),
      bidders: moy(lot.filter((r) => r.bidders != null).map((r) => r.bidders!)),
    }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

/**
 * L'exécution du programme d'émission : annoncé contre servi.
 *
 * Sur les séances relevées seulement, ce qui n'est pas le programme annuel
 * d'un Trésor et ne doit pas se présenter comme tel. La mécanique est en place
 * et le chiffre devient publiable le jour où la série est complète ; d'ici là
 * le compte de séances tient lieu d'avertissement.
 */
export interface ProgramYear {
  country: Country;
  year: string;
  announced: number;
  served: number;
  /** Servi sur annoncé, en %. */
  execution: number;
  sessions: number;
}

export function programByYear(rows: AuctionResult[]): ProgramYear[] {
  const cle = new Map<string, ProgramYear>();
  for (const r of rows) {
    if (!r.announced) continue;
    const k = `${r.country}|${r.sessionOn.slice(0, 4)}`;
    const a = cle.get(k) ?? { country: r.country, year: r.sessionOn.slice(0, 4), announced: 0, served: 0, execution: 0, sessions: 0 };
    a.announced += r.announced;
    a.served += r.served ?? 0;
    a.sessions += 1;
    cle.set(k, a);
  }
  return [...cle.values()]
    .map((a) => ({ ...a, execution: (a.served / a.announced) * 100 }))
    .sort((a, b) => a.country.localeCompare(b.country) || a.year.localeCompare(b.year));
}
