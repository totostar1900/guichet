"use client";

import { useCallback, useRef, useState } from "react";
import { labelMetrics, useOutsideTap, usePhone } from "./chart-utils";
import { daysBetween } from "@/lib/finance";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./QuoteHistory.module.css";
import { useT } from "@/i18n/client";

/** One published NAV as the chart shows it : the bubble tells the whole story of the point. */
export interface NavPoint {
  date: string;
  nav: number;
  variationPct?: number;
  perfSinceInceptionPct: number;
  bulletinNo: number;
}

/** Dates under the axis: every point when there are few, otherwise six evenly spaced ones (first and last included). */
export const axisTicks = (n: number, count = 6): number[] => (n <= 8 ? Array.from({ length: n }, (_, i) => i) : Array.from({ length: count }, (_, k) => Math.round((k * (n - 1)) / (count - 1))));
/** Over more than a year the year matters and the labels get longer: five of them, with the year. */
export const axisLabel = (dates: string[]) => {
  const long = dates.length > 1 && daysBetween(dates[0], dates[dates.length - 1]) > 366;
  return { ticks: axisTicks(dates.length, long ? 5 : 6), label: (d: string) => fmtDate(d, long) };
};

const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

/** The NAV curve, one dot per bulletin, with a bubble on hover or touch showing that NAV. */
export function NavChart({ series, sinceStart }: { series: NavPoint[]; sinceStart?: boolean }) {
  const t = useT();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const phone = usePhone();
  const metrics = labelMetrics(phone);
  useOutsideTap(ref, hover != null, useCallback(() => setHover(null), []));
  const values = series.map((n) => n.nav);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const W = 320;
  const H = 96;
  const pad = 6;
  const padX = Math.max(fmt(max).length, fmt(min).length) * metrics.perChar + 8; // room for the two value labels on the left
  const x = (i: number) => (series.length === 1 ? W / 2 : padX + (i * (W - padX - pad)) / (series.length - 1));
  const y = (v: number) => (max === min ? H / 2 : H - pad - ((v - min) * (H - 2 * pad)) / (max - min));
  const path = series.map((n, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(n.nav).toFixed(1)}`).join(" ");
  const area = `${path} L${x(series.length - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`;
  const iMax = values.indexOf(max);
  const iMin = values.indexOf(min);
  const last = series.length - 1;
  const axis = axisLabel(series.map((p) => p.date));

  // The nearest point to the pointer, in viewBox units.
  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < series.length; i++) if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i;
    setHover(best);
  };
  const h = hover == null ? null : series[hover];
  const prev = hover != null && hover > 0 ? series[hover - 1] : null;

  return (
    <div className={styles.navChart}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H + 14}`}
        role="img"
        aria-label={`${series.length} ${t("valeurs liquidatives publiées")}, ${fmt(series[0].nav)} → ${fmt(series[last].nav)} FCFA`}
        onMouseMove={(e) => pick(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => pick(e.touches[0].clientX)}
        onTouchMove={(e) => pick(e.touches[0].clientX)}
      >
        <line x1={padX} x2={W - pad} y1={y(max)} y2={y(max)} className={styles.guide} />
        <line x1={padX} x2={W - pad} y1={y(min)} y2={y(min)} className={styles.guide} />
        <text x={padX - 4} y={y(max) + 3} className={styles.tick} style={{ fontSize: metrics.font }} textAnchor="end">
          {fmt(max)}
        </text>
        {max !== min && (
          <text x={padX - 4} y={y(min) + 3} className={styles.tick} style={{ fontSize: metrics.font }} textAnchor="end">
            {fmt(min)}
          </text>
        )}
        <path d={area} className={styles.area} />
        <path d={path} className={styles.line} />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad} y2={H - pad} className={styles.cursor} />}
        {series.map((n, i) => (
          <circle key={n.date} cx={x(i)} cy={y(n.nav)} r={i === hover ? 4 : i === last ? 3.5 : i === iMax || i === iMin ? 2.6 : 1.6} className={i === last || i === hover ? styles.dot : styles.point}>
            <title>{`${fmtDate(n.date)} · ${fmt(n.nav)} FCFA`}</title>
          </circle>
        ))}
        {axis.ticks.map((i) => (
          <text key={i} x={x(i)} y={H + 11} className={styles.tick} style={{ fontSize: metrics.font }} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}>
            {axis.label(series[i].date)}
          </text>
        ))}
      </svg>
      {h && hover != null && (
        <div
          className={`${styles.tip} ${y(h.nav) < H * 0.45 ? styles.tipBelow : ""} ${x(hover) > W * 0.72 ? styles.tipLeft : x(hover) < W * 0.28 ? styles.tipRight : ""}`}
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.nav) / (H + 14)) * 100}%` }}
          role="status"
        >
          <b>{fmt(h.nav)} FCFA</b>
          <span>
            {t("VL du")} {fmtDate(h.date)} · BOC n° {h.bulletinNo}
          </span>
          <span>
            {t("Variation")} {signed(h.variationPct ?? (prev ? (h.nav / prev.nav - 1) * 100 : undefined))}
            {prev ? ` ${t("depuis le")} ${fmtDate(prev.date, false)}` : ""}
          </span>
          {sinceStart && hover > 0 && (
            <span>
              {t("Depuis le début de la période")} {signed(series[0].nav > 0 ? (h.nav / series[0].nav - 1) * 100 : undefined)}
            </span>
          )}
          <span>
            {t("Depuis l'origine")} {signed(h.perfSinceInceptionPct)}
          </span>
        </div>
      )}
    </div>
  );
}
