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
  const H = 96;
  const pad = 6;
  const padX = 34; // room for the two value labels on the left
  const x = (i: number) => (series.length === 1 ? W / 2 : padX + (i * (W - padX - pad)) / (series.length - 1));
  const y = (v: number) => (max === min ? H / 2 : H - pad - ((v - min) * (H - 2 * pad)) / (max - min));
  const path = series.map((n, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(n.nav).toFixed(1)}`).join(" ");
  const area = `${path} L${x(series.length - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`;
  const first = series[0].nav;
  const change = first > 0 ? (latest.nav / first - 1) * 100 : 0;
  const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
  // Guides: the highest and lowest NAV of the window, the last point labelled, one dot per published NAV.
  const iMax = values.indexOf(max);
  const iMin = values.indexOf(min);
  const ticks = series.length <= 8 ? series.map((_, i) => i) : [0, Math.round(series.length / 3), Math.round((2 * series.length) / 3), series.length - 1];

  return (
    <div className={styles.wrap}>
      <div className={styles.chart}>
        <svg viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label={`${series.length} valeurs liquidatives publiées, de ${fmt(first)} à ${fmt(latest.nav)} FCFA`}>
          <line x1={padX} x2={W - pad} y1={y(max)} y2={y(max)} className={styles.guide} />
          <line x1={padX} x2={W - pad} y1={y(min)} y2={y(min)} className={styles.guide} />
          <text x={padX - 4} y={y(max) + 3} className={styles.tick} textAnchor="end">
            {fmt(max)}
          </text>
          {max !== min && (
            <text x={padX - 4} y={y(min) + 3} className={styles.tick} textAnchor="end">
              {fmt(min)}
            </text>
          )}
          <path d={area} className={styles.area} />
          <path d={path} className={styles.line} />
          {series.map((n, i) => (
            <circle key={n.navDate} cx={x(i)} cy={y(n.nav)} r={i === series.length - 1 ? 3.5 : i === iMax || i === iMin ? 2.6 : 1.6} className={i === series.length - 1 ? styles.dot : styles.point} aria-label={`${fmtDate(n.navDate)} · ${fmt(n.nav)} FCFA`} />
          ))}
          {ticks.map((i) => (
            <text key={i} x={x(i)} y={H + 11} className={styles.tick} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}>
              {fmtDate(series[i].navDate, false)}
            </text>
          ))}
        </svg>
        <div className={styles.legend}>
          <span>
            {series.length} valeurs liquidatives publiées au bulletin, du {fmtDate(series[0].navDate)} au {fmtDate(latest.navDate)} · plus haut {fmt(max)}, plus bas {fmt(min)}
          </span>
          <b className={change < 0 ? styles.down : styles.up} title="Variation de la VL entre la première et la dernière date affichées">
            {signed(change)}
          </b>
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
