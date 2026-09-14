import type { FundNav } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./QuoteHistory.module.css";

/** NAV series of a fund as read in the bulletins, oldest to newest. Same look as the quote history. */
export function NavHistory({ navs }: { navs: FundNav[] }) {
  if (navs.length === 0) return null;
  const latest = navs[0];
  const series = [...navs].reverse().slice(-60);
  const values = series.map((n) => n.nav);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const W = 320;
  const H = 64;
  const pad = 4;
  const x = (i: number) => (series.length === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (series.length - 1));
  const y = (v: number) => (max === min ? H / 2 : H - pad - ((v - min) * (H - 2 * pad)) / (max - min));
  const path = series.map((n, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(n.nav).toFixed(1)}`).join(" ");
  const area = `${path} L${x(series.length - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`;
  const first = series[0].nav;
  const change = first > 0 ? (latest.nav / first - 1) * 100 : 0;
  const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

  return (
    <div className={styles.wrap}>
      <div className={styles.chart}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Valeur liquidative sur ${series.length} dates, de ${fmt(first)} à ${fmt(latest.nav)} FCFA`}>
          <path d={area} className={styles.area} />
          <path d={path} className={styles.line} />
          <circle cx={x(series.length - 1)} cy={y(latest.nav)} r={3.5} className={styles.dot} />
        </svg>
        <div className={styles.legend}>
          <span>
            {series.length} VL · du {fmtDate(series[0].navDate)} au {fmtDate(latest.navDate)}
          </span>
          <b className={change < 0 ? styles.down : styles.up}>{signed(change)}</b>
        </div>
      </div>
      <dl className={styles.frame}>
        <div>
          <dt>Dernière VL</dt>
          <dd>{fmt(latest.nav)} FCFA</dd>
        </div>
        <div>
          <dt>Variation</dt>
          <dd className={(latest.variationPct ?? 0) < 0 ? styles.down : (latest.variationPct ?? 0) > 0 ? styles.up : undefined}>{signed(latest.variationPct)}</dd>
        </div>
        <div>
          <dt>Sur un mois · un trimestre</dt>
          <dd>
            {signed(latest.variationMonthlyPct)} · {signed(latest.variationQuarterlyPct)}
          </dd>
        </div>
        <div>
          <dt>Depuis l&apos;origine</dt>
          <dd>
            {signed(latest.perfSinceInceptionPct)} <small className={styles.muted}>(VL d&apos;origine {fmt(latest.navOrigin)}, {fmtDate(latest.inceptionDate)})</small>
          </dd>
        </div>
      </dl>
      <table className={styles.tbl}>
        <thead>
          <tr>
            <th>Date de VL</th>
            <th className={styles.r}>VL (FCFA)</th>
            <th className={styles.r}>Var.</th>
            <th>Bulletin</th>
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
