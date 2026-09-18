import type { FundNav } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { NavChart } from "./NavChart";
import styles from "./QuoteHistory.module.css";
import { getT } from "@/i18n/server";

/** NAV series of a fund as read in the bulletins, oldest to newest. Same look as the quote history. */
export async function NavHistory({ navs }: { navs: FundNav[] }) {
  const t = await getT();
  if (navs.length === 0) return null;
  const latest = navs[0];
  const series = [...navs].reverse().slice(-60);
  const values = series.map((n) => n.nav);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = series[0].nav;
  const change = first > 0 ? (latest.nav / first - 1) * 100 : 0;
  const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

  return (
    <div className={styles.wrap}>
      <div className={`${styles.chart} ${styles.navBlock}`}>
        <NavChart series={series.map((n) => ({ date: n.navDate, nav: n.nav, variationPct: n.variationPct, perfSinceInceptionPct: n.perfSinceInceptionPct, bulletinNo: n.bulletinNo }))} />
        <div className={styles.legend}>
          <span>
            {t("{n} valeurs liquidatives publiées au bulletin, du {a} au {b} · plus haut {hi}, plus bas {lo}", { n: series.length, a: fmtDate(series[0].navDate), b: fmtDate(latest.navDate), hi: fmt(max), lo: fmt(min) })}
          </span>
          <b className={change < 0 ? styles.down : styles.up} title={t("Variation de la VL entre la première et la dernière date affichées")}>
            {signed(change)}
          </b>
        </div>
      </div>
      <dl className={styles.frame}>
        <div>
          <dt>{t("Dernière VL")}</dt>
          <dd>{fmt(latest.nav)} FCFA</dd>
        </div>
        <div>
          <dt>{t("Variation")}</dt>
          <dd className={(latest.variationPct ?? 0) < 0 ? styles.down : (latest.variationPct ?? 0) > 0 ? styles.up : undefined}>{signed(latest.variationPct)}</dd>
        </div>
        <div>
          <dt>{t("Sur un mois · un trimestre")}</dt>
          <dd>
            {signed(latest.variationMonthlyPct)} · {signed(latest.variationQuarterlyPct)}
          </dd>
        </div>
        <div>
          <dt>{t("Depuis l'origine")}</dt>
          <dd>
            {signed(latest.perfSinceInceptionPct)} <small className={styles.muted}>(VL d&apos;origine {fmt(latest.navOrigin)}, {fmtDate(latest.inceptionDate)})</small>
          </dd>
        </div>
      </dl>
      <table className={styles.tbl}>
        <thead>
          <tr>
            <th>{t("Date de VL")}</th>
            <th className={styles.r}>{t("VL (FCFA)")}</th>
            <th className={styles.r}>{t("Var.")}</th>
            <th>{t("Bulletin")}</th>
          </tr>
        </thead>
        <tbody>
          {navs.slice(0, 6).map((n) => (
            <tr key={n.navDate}>
              <td>{fmtDate(n.navDate)}</td>
              <td className={styles.r}>{fmt(n.nav)}</td>
              <td className={`${styles.r} ${(n.variationPct ?? 0) < 0 ? styles.down : (n.variationPct ?? 0) > 0 ? styles.up : ""}`}>{signed(n.variationPct)}</td>
              <td className={styles.muted}>BOC n° {n.bulletinNo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
