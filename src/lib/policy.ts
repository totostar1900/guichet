import "server-only";
import { cache } from "react";
import { repo } from "@/lib/data";
import type { Offer } from "@/lib/domain/types";
import { OUVERTE, type CashPolicy } from "@/lib/domain/cash";
import { CROSS_CLOSED, type CrossPolicy } from "@/lib/domain/crossing";
import { PREAVIS_DEFAUT, type StandingPolicy } from "@/lib/domain/preavis";
import { BAREME_FERME, type BaremeGarde } from "@/lib/domain/garde";
import { REF } from "@/lib/reference";

/**
 * Four-eyes without a bottleneck: the responsable delegates a window; inside
 * it an opérateur publishes alone, outside it the change waits for approval.
 * Stored in the reference table (kind "policy") so the responsable edits it in
 * the app; these defaults apply until then.
 */
export interface ApprovalPolicy {
  enabled: boolean;
  pricePct: { min: number; max: number }; // OTA / APE price window, % of nominal
  precountRate: { min: number; max: number }; // BTA, %
  quoteMovePct: number; // listed lines: a desk quote moving more than this vs the last price needs approval
  fundEntryFeeMax: number; // % : a fund published with higher fees needs approval
}

export const POLICY_DEFAULT: ApprovalPolicy = { enabled: true, pricePct: { min: 90, max: 100.5 }, precountRate: { min: 2, max: 9 }, quoteMovePct: 10, fundEntryFeeMax: 3 };
export const POLICY_KEY = "approbation";

export const loadPolicy = cache(async (): Promise<ApprovalPolicy> => {
  try {
    const rows = await repo().listReference(REF.policy);
    const row = rows.find((r) => r.key === POLICY_KEY);
    return row ? { ...POLICY_DEFAULT, ...(row.data as Partial<ApprovalPolicy>) } : POLICY_DEFAULT;
  } catch {
    return POLICY_DEFAULT;
  }
});

/**
 * Le signal d'appariement : ce que le client apprend du carnet interne.
 *
 * Il est rangé avec la fenêtre déléguée parce que c'est la même nature de
 * décision : une règle de maison que le responsable écrit dans l'application,
 * et non un réglage d'opérateur.
 *
 * Fermé tant que personne ne l'a ouvert, y compris quand la table de référence
 * est injoignable. Un signal qui s'allumerait sur une panne de lecture
 * publierait le carnet par accident, et l'inverse ne coûte qu'un silence.
 */
export const CROSS_POLICY_KEY = "appariement";

export const loadCrossPolicy = cache(async (): Promise<CrossPolicy> => {
  try {
    const rows = await repo().listReference(REF.policy);
    const row = rows.find((r) => r.key === CROSS_POLICY_KEY);
    return row ? { ...CROSS_CLOSED, ...(row.data as Partial<CrossPolicy>) } : CROSS_CLOSED;
  } catch {
    return CROSS_CLOSED;
  }
});

/**
 * Le barème des droits de garde : une décision de maison, pas un réglage.
 *
 * Il se range avec le signal d'appariement et la fenêtre déléguée parce que
 * c'est la même nature de chose : une règle que le responsable écrit dans
 * l'application, et dont l'absence a un sens.
 *
 * Fermé tant que personne ne l'a ouvert, y compris quand la table de référence
 * est injoignable. Un barème qui s'ouvrirait sur une panne de lecture
 * prélèverait par accident, et l'inverse ne coûte qu'un trimestre à zéro. Il
 * n'y a pas de tarif par défaut, parce qu'un tarif par défaut serait un
 * prélèvement décidé par le code.
 */
export const GARDE_POLICY_KEY = "droits-de-garde";

export const loadBaremeGarde = cache(async (): Promise<BaremeGarde> => {
  try {
    const rows = await repo().listReference(REF.policy);
    const row = rows.find((r) => r.key === GARDE_POLICY_KEY);
    return row ? { ...BAREME_FERME, ...(row.data as Partial<BaremeGarde>) } : BAREME_FERME;
  } catch {
    return BAREME_FERME;
  }
});

/**
 * La politique des espèces : ce que la maison fait du solde d'un client.
 *
 * Elle se range avec les trois autres parce que c'est la même nature de chose,
 * mais son défaut est l'inverse du leur, et c'est voulu. Les trois autres sont
 * fermées par défaut parce qu'une lecture manquée ne doit pas publier un
 * carnet, prélever des frais ou élargir une délégation par accident.
 *
 * Ici, la plus stricte des positions n'est pas la plus prudente : la politique
 * fermée RENVOIE l'argent, et renvoyer sur une panne de lecture le solde d'un
 * client qui a demandé à le garder serait un mouvement de trop, pas un silence.
 * Le défaut est donc la règle en vigueur, décidée le 2 octobre 2026.
 */
export const CASH_POLICY_KEY = "especes";

export const loadCashPolicy = cache(async (): Promise<CashPolicy> => {
  try {
    const rows = await repo().listReference(REF.policy);
    const row = rows.find((r) => r.key === CASH_POLICY_KEY);
    return row ? { ...OUVERTE, ...(row.data as Partial<CashPolicy>) } : OUVERTE;
  } catch {
    return OUVERTE;
  }
});

/**
 * Le délai entre le préavis et l'exécution d'une instruction permanente.
 *
 * Elle se range avec les quatre autres, et son défaut est un jour plutôt que
 * zéro : zéro rétablirait l'ancien comportement sous un nouveau nom, puisque
 * annoncer et exécuter le même jour, c'est exécuter sans préavis.
 */
export const STANDING_POLICY_KEY = "instructions";

export const loadStandingPolicy = cache(async (): Promise<StandingPolicy> => {
  try {
    const rows = await repo().listReference(REF.policy);
    const row = rows.find((r) => r.key === STANDING_POLICY_KEY);
    return row ? { ...PREAVIS_DEFAUT, ...(row.data as Partial<StandingPolicy>) } : PREAVIS_DEFAUT;
  } catch {
    return PREAVIS_DEFAUT;
  }
});

/** Why this offer, as about to be written, needs a responsable : or null when it is inside the window. */
export function approvalReason(next: Offer, prev: Offer | undefined, p: ApprovalPolicy): string | null {
  if (!p.enabled) return null;
  const out = (n: number, w: { min: number; max: number }) => n < w.min || n > w.max;
  if ((next.kind === "OTA" || next.kind === "APE") && next.pricePct != null && out(next.pricePct, p.pricePct)) return `Prix ${next.pricePct} % hors de la fenêtre déléguée (${p.pricePct.min}–${p.pricePct.max} %)`;
  if (next.kind === "BTA" && next.precountRate != null && out(next.precountRate, p.precountRate)) return `Taux précompté ${next.precountRate} % hors de la fenêtre déléguée (${p.precountRate.min}–${p.precountRate.max} %)`;
  if (next.kind === "MARCHE" && prev?.lastPrice && next.lastPrice && next.priceSource === "desk") {
    const move = Math.abs(next.lastPrice / prev.lastPrice - 1) * 100;
    if (move > p.quoteMovePct) return `Cours saisi à ${move.toFixed(1)} % du dernier cours (seuil ${p.quoteMovePct} %)`;
  }
  if (next.kind === "FONDS" && next.fund && next.fund.entryFeePct > p.fundEntryFeeMax) return `Frais d'entrée ${next.fund.entryFeePct} % au-dessus du plafond délégué (${p.fundEntryFeeMax} %)`;
  return null;
}
