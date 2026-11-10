/**
 * CE QUE GUICHET MONTRE DES ADJUDICATIONS, ET RIEN DE PLUS (6 novembre 2026).
 *
 * Le client lit ici ce que le communiqué du Trésor imprime : le minimum, le
 * maximum, la limite, le moyen, le montant annoncé, les soumissions, le servi,
 * la couverture, le nombre de soumissionnaires. Rien d'autre ne sort de cette
 * fonction, quelle que soit la source qui a rempli la séance.
 *
 * LA PROJECTION EST UNE LISTE BLANCHE, ET NON UNE LISTE DE RETRAITS. Un champ
 * ajouté demain à `AuctionResult` (une mesure du carnet, une identité, la
 * provenance) ne paraît pas chez le client tant que quelqu'un ne l'a pas écrit
 * ici, avec le test qui le garde. Le carnet d'offres, la part rejetée au prix,
 * le nombre d'offres, les comptes, les banques, l'état « Reçue » du carnet en
 * cours et la source des chiffres restent au Desk.
 *
 * Seules entrent les séances relues par une personne et non écartées : un
 * chiffre que personne n'a confirmé n'est pas un résultat.
 *
 * LA COUVERTURE EST CELLE QUE LE COMMUNIQUÉ IMPRIME. `coverageOf` la recalcule
 * à partir des soumissions quand elle manque, ce qui est juste au Desk et faux
 * ici : un chiffre recalculé n'est pas dans le communiqué.
 */
import type { AuctionResult } from "./auction-results";
import { compteDansLesResultats } from "./auction-results";
import { auctionYield, type YieldOrigin } from "./yield";

/** Les champs que le client peut lire, un à un. Tout le reste est écarté. */
export const CHAMPS_CLIENT = [
  "announced",
  "bid",
  "served",
  "networkSize",
  "bidders",
  "coverage",
  "rateMin",
  "rateMax",
  "rateLimit",
  "rateAvg",
  "priceMin",
  "priceMax",
  "priceLimit",
  "priceAvg",
  "yieldAvg",
  "yieldLimit",
  "couponRate",
] as const;
export type ChampClient = (typeof CHAMPS_CLIENT)[number];

export interface SeanceClient extends Partial<Record<ChampClient, number>> {
  id: string;
  sessionOn: string;
  country: AuctionResult["country"];
  instrument: AuctionResult["instrument"];
  tenor: string;
  codeEmission?: string;
  /** L'échéance que le communiqué imprime. */
  maturityOn?: string;
  /** Le rendement actuariel, et son origine : imprimé par le Trésor, ou calculé (src/lib/market/yield.ts) à partir du prix et du coupon, ou du taux précompté. Le client lit les deux pour comparer un bon et une obligation. */
  rendement?: number;
  rendementOrigine?: YieldOrigin;
}

/** Le jour avant lequel l'état des offres n'est pas lisible : la couverture d'avant est une indication. */
export const COUVERTURE_FIABLE_DEPUIS = "2023-02-01";

export function vueClient(rows: AuctionResult[]): SeanceClient[] {
  const out: SeanceClient[] = [];
  for (const r of rows) {
    if (!compteDansLesResultats(r) || !r.confirmedBy) continue;
    const s: SeanceClient = { id: r.id, sessionOn: r.sessionOn, country: r.country, instrument: r.instrument, tenor: r.tenor };
    if (r.codeEmission) s.codeEmission = r.codeEmission;
    if (r.maturityOn) s.maturityOn = r.maturityOn;
    const y = auctionYield(r);
    if (y) {
      s.rendement = y.pct;
      s.rendementOrigine = y.origin;
    }
    for (const c of CHAMPS_CLIENT) {
      const v = r[c];
      if (typeof v === "number" && Number.isFinite(v)) s[c] = v;
    }
    out.push(s);
  }
  return out.sort((a, b) => (a.sessionOn < b.sessionOn ? 1 : a.sessionOn > b.sessionOn ? -1 : a.id.localeCompare(b.id)));
}

/** Une séance qui n'a rien servi : le taux qui reste est celui qu'on a demandé, pas un taux payé. */
export const aServi = (s: SeanceClient): boolean => s.served != null && s.served > 0;

/** Le taux limite le plus récent de chaque couple Trésor × durée, pour les bons (13, 26, 52 semaines). */
export interface LigneDuree {
  country: SeanceClient["country"];
  tenor: string;
  rateLimit: number;
  sessionOn: string;
}

export const DUREES_BTA = ["13 semaines", "26 semaines", "52 semaines"] as const;

export function tauxLimiteParDuree(rows: SeanceClient[]): LigneDuree[] {
  const vus = new Map<string, LigneDuree>();
  for (const s of rows) {
    if (s.instrument !== "BTA" || s.rateLimit == null || !aServi(s)) continue;
    if (!(DUREES_BTA as readonly string[]).includes(s.tenor)) continue;
    const k = `${s.country}|${s.tenor}`;
    const deja = vus.get(k);
    if (!deja || deja.sessionOn < s.sessionOn) vus.set(k, { country: s.country, tenor: s.tenor, rateLimit: s.rateLimit, sessionOn: s.sessionOn });
  }
  return [...vus.values()].sort((a, b) => a.country.localeCompare(b.country) || DUREES_BTA.indexOf(a.tenor as (typeof DUREES_BTA)[number]) - DUREES_BTA.indexOf(b.tenor as (typeof DUREES_BTA)[number]));
}

/**
 * La part des séances couvertes, sur les douze derniers mois lus.
 *
 * « Couverte » : les soumissions ont atteint le montant annoncé, tel que le
 * communiqué le dit (couverture imprimée ≥ 100 %). Avant le 1er février 2023
 * la couverture vient d'un carnet dont on ne lit pas l'état des offres : on ne
 * la compte pas, et la page le dit.
 */
export function partCouverte(rows: SeanceClient[], jusquau: string): { couvertes: number; sur: number; depuis: string } | undefined {
  const [y, m, d] = jusquau.split("-").map(Number);
  const debut = new Date(Date.UTC(y - 1, m - 1, d)).toISOString().slice(0, 10);
  const depuis = debut < COUVERTURE_FIABLE_DEPUIS ? COUVERTURE_FIABLE_DEPUIS : debut;
  const dans = rows.filter((s) => s.sessionOn >= depuis && s.sessionOn <= jusquau && s.coverage != null);
  if (!dans.length) return undefined;
  return { couvertes: dans.filter((s) => (s.coverage as number) >= 100).length, sur: dans.length, depuis };
}
