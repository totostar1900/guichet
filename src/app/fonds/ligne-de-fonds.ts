import type { Offer } from "@/lib/domain/types";
import type { FundRow } from "./FundsBrowser";
import type { FundCurve } from "@/lib/domain/fund-curve";
import { fundAnnualPct } from "@/lib/domain/fund-perf";

/** Un fonds tel que les cartes le lisent : plat, sérialisable, calculé sur le serveur. Un seul assemblage pour la page des fonds et l'Accueil (10 novembre 2026). */
export function ligneDeFonds(o: Offer & { fund: NonNullable<Offer["fund"]> }, curve: FundCurve | undefined, maintenant: Date): FundRow {
  return { id: o.id, title: o.title, isin: o.isin ?? "", category: o.fund.category, frequency: o.fund.frequency, manager: o.issuer, depositary: o.fund.depositary, nav: o.fund.nav, navDate: o.fund.navDate, variationPct: o.fund.variationPct, perf1yPct: o.fund.perf1yPct, perfSinceInceptionPct: o.fund.perfSinceInceptionPct, annualPct: fundAnnualPct(o.fund, maintenant) ?? undefined, inceptionDate: o.fund.inceptionDate, open: o.fund.distributed && !o.hidden, entryFeePct: o.fund.entryFeePct, exitFeePct: o.fund.exitFeePct, managementFeePct: o.fund.managementFeePct, minAmount: o.fund.minAmount, cutoff: o.fund.cutoff, settlementDays: o.fund.settlementDays, curve };
}
