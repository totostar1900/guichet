import { KpiCard } from "@/components/KpiCard";
import { explainKpis } from "@/lib/domain/explain";
import { displayYield } from "@/lib/domain/status";
import type { Offer } from "@/lib/domain/types";
import { fmt, fmtDate, fmtPct, fmtPrice } from "@/lib/format";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { daysBetween } from "@/lib/finance";
import styles from "./page.module.css";

/**
 * Les chiffres d’une ligne, chacun s’ouvrant sur son calcul.
 *
 * Le nominal vient en dernier quand la ligne en a un. Il manquait, et c’est
 * précisément lui qu’il faut pour lire le reste : un ordre sur une obligation se
 * saisit en montant nominal, et un cours de « 101 % » ne veut rien dire sans
 * savoir 101 % de quoi.
 */
export function Kpis({ o }: { o: Offer }) {
  const dy = displayYield(o);
  const y = dy.pct;
  const yTxt = y != null ? `${dy.approx ? "≈ " : ""}${fmtPct(y, 2)}` : "—";
  const items: [string, string, boolean][] =
    o.kind === "OTA" || o.kind === "APE"
      ? [
          [dy.atPar ? `Taux nominal ${o.servedPricePct ? "servi" : "visé"} au pair` : `Rendement actuariel ${o.servedPricePct ? "servi" : "visé"}`, yTxt, true],
          [`Prix ${o.servedPricePct ? "servi" : "Purpose"}`, fmtPrice(o.servedPricePct ?? o.pricePct ?? 100), false],
          ["Coupon annuel", fmtPct(o.couponRate ?? 0, 2), false],
          ["Nominal par titre (FCFA)", o.nominal ? fmt(o.nominal) : "—", false],
        ]
      : o.kind === "FONDS" && o.fund
        ? [
            [o.fund.perf1yPct != null ? "Performance sur 12 mois" : `Depuis l'origine${o.fund.inceptionDate ? ` (${fmtDate(o.fund.inceptionDate)})` : ""}`, o.fund.perf1yPct != null ? `${o.fund.perf1yPct > 0 ? "+" : ""}${fmtPct(o.fund.perf1yPct, 2)}` : `${o.fund.perfSinceInceptionPct > 0 ? "+" : ""}${fmtPct(o.fund.perfSinceInceptionPct, 2)}`, true],
            ["Valeur liquidative (FCFA)", fmt(o.fund.nav), false],
            ["Catégorie", `${FUND_CATEGORY_LABEL[o.fund.category]} · ${FUND_FREQUENCY_LABEL[o.fund.frequency]}`, false],
          ]
      : o.kind === "MARCHE"
        ? [
            [dy.atPar ? "Taux nominal · au pair" : o.instrument === "obligation" ? "Rendement actuariel annuel brut au cours" : "Rendement du dernier dividende", yTxt, true],
            [o.instrument === "obligation" ? "Coupon facial" : "Dernier dividende brut", o.instrument === "obligation" ? fmtPct(o.couponRate ?? 0, 2) : o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—", false],
            [o.instrument === "obligation" ? "Dernier cours (% nominal)" : "Dernier cours (FCFA)", o.lastPrice != null ? (o.instrument === "obligation" ? fmtPrice(o.lastPrice) : fmt(o.lastPrice)) : "—", false],
            ...(o.instrument === "obligation" && o.nominal ? ([["Nominal par titre (FCFA)", fmt(o.nominal), false]] as [string, string, boolean][]) : []),
          ]
      : o.kind === "BTA"
        ? [
            ["Rendement actuariel annuel", y != null ? fmtPct(y, 2) : "—", true],
            ["Taux précompté", fmtPct(o.precountRate ?? 0, 2), false],
            ["Durée", o.maturityOn ? `${daysBetween(o.settleOn, o.maturityOn)} jours` : "—", false],
          ]
        : o.kind === "ACTIONS"
          ? [
              ["Rendement du dividende au prix", y != null ? fmtPct(y, 2) : "—", true],
              ["Dernier dividende brut", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—", false],
              ["Prix de souscription (FCFA)", fmt(o.pricePerShare ?? 0), false],
            ]
          : [
              ["Prix de rachat", "100 %", true],
              ["Échéance initiale", o.maturityOn ? fmtDate(o.maturityOn) : "—", false],
              ["Volume racheté", o.sizeLabel ?? "—", false],
              ...(o.nominal ? ([["Nominal par titre (FCFA)", fmt(o.nominal), false]] as [string, string, boolean][]) : []),
            ];
  // Every card opens on tap: the number decomposed with this line's own figures.
  const explains = explainKpis(o);
  return (
    <div className={styles.kpis} data-coach="kpis">
      {items.map(([k, v, gold], i) => (
        <KpiCard key={k} label={k} value={v} gold={gold} explain={explains[i]} compareHref={`/comparer?a=${o.id}`} coach={gold ? "hero" : undefined} />
      ))}
    </div>
  );
}
