import type { FundNav } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { NavPeriod } from "./NavPeriod";
import styles from "./QuoteHistory.module.css";
import { getT } from "@/i18n/server";

/** NAV series of a fund as read in the bulletins, oldest to newest. Same look as the quote history. */
export async function NavHistory({ navs, benchmark }: { navs: FundNav[]; benchmark?: { label: string; pct: number } }) {
  const t = await getT();
  if (navs.length === 0) return null;
  const latest = navs[0];
  const series = [...navs].reverse(); // oldest → newest, the whole history: the reader picks the window
  const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

  return (
    <div className={styles.wrap}>
      <NavPeriod series={series.map((n) => ({ date: n.navDate, nav: n.nav, variationPct: n.variationPct, perfSinceInceptionPct: n.perfSinceInceptionPct, bulletinNo: n.bulletinNo }))} benchmark={benchmark} />
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
