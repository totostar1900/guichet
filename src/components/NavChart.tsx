"use client";

import { useState } from "react";
import { RangeRead, TrackMarks, TrackTip, trackStyles, useTracker } from "./charts/tracker";
import { labelMetrics, usePhone } from "./chart-utils";
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
/**
 * Over more than a year the year matters and the labels get longer: five of them, with the year.
 * The phone draws its labels larger, so it gets fewer: four, three with the year.
 */
export const axisLabel = (dates: string[], phone = false) => {
  const long = dates.length > 1 && daysBetween(dates[0], dates[dates.length - 1]) > 366;
  return { ticks: axisTicks(dates.length, phone ? (long ? 3 : 4) : long ? 5 : 6), label: (d: string) => fmtDate(d, long) };
};
/** The date row sits lower on the phone, clear of the lowest value label. */
export const axisRow = (phone: boolean) => (phone ? { y: 20, extra: 24 } : { y: 11, extra: 14 });

const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

/** The NAV curve, one dot per bulletin, with a bubble on hover or touch showing that NAV. */
export function NavChart({ series, sinceStart, range, onRange }: { series: NavPoint[]; sinceStart?: boolean; range?: [string, string]; onRange?: (from: string, to: string) => void }) {
  const t = useT();
  const phone = usePhone();
  const metrics = labelMetrics(phone);
  // the first tap pins a date ; the second hands the range to the page, which reframes everything on it
  const [pin, setPin] = useState<string | null>(null);
  const values = series.map((n) => n.nav);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const W = 320;
  const H = 96;
  const row = axisRow(phone);
  const pad = 6;
  const padX = Math.max(fmt(max).length, fmt(min).length) * metrics.perChar + 8; // room for the two value labels on the left
  const x = (i: number) => (series.length === 1 ? W / 2 : padX + (i * (W - padX - pad)) / (series.length - 1));
  const y = (v: number) => (max === min ? H / 2 : H - pad - ((v - min) * (H - 2 * pad)) / (max - min));
  const path = series.map((n, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(n.nav).toFixed(1)}`).join(" ");
  const area = `${path} L${x(series.length - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`;
  const iMax = values.indexOf(max);
  const iMin = values.indexOf(min);
  const last = series.length - 1;
  const axis = axisLabel(series.map((p) => p.date), phone);
  const keys = series.map((p) => p.date);
  const idx = (k: string) => keys.indexOf(k);
  const pins = pin ? [pin] : range ? [range[0], range[1]].filter((d) => keys.includes(d)) : [];
  const track = useTracker({
    keys,
    x,
    yAt: (i) => y(series[i].nav),
    W,
    H: H + row.extra,
    pins,
    onPin: (k) => {
      if (!onRange) return;
      if (pin && pin !== k) {
        const [a, b] = [pin, k].sort();
        setPin(null);
        onRange(a, b);
      } else setPin(pin === k ? null : k);
    },
  });
  const hover = track.hover;
  const h = hover == null ? null : series[hover];
  const prev = hover != null && hover > 0 ? series[hover - 1] : null;

  return (
    <div className={styles.navChart}>
      <svg viewBox={`0 0 ${W} ${H + row.extra}`} role="img" aria-label={`${series.length} ${t("valeurs liquidatives publiées")}, ${fmt(series[0].nav)} → ${fmt(series[last].nav)} FCFA`} {...track.handlers}>
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
        {series.map((n, i) => (
          <circle key={n.date} cx={x(i)} cy={y(n.nav)} r={i === hover ? 4 : i === last ? 3.5 : i === iMax || i === iMin ? 2.6 : 1.6} className={i === last || i === hover ? styles.dot : styles.point}>
            <title>{`${fmtDate(n.date)} · ${fmt(n.nav)} FCFA`}</title>
          </circle>
        ))}
        {axis.ticks.map((i) => (
          <text key={i} x={x(i)} y={H + row.y} className={styles.tick} style={{ fontSize: metrics.font }} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}>
            {axis.label(series[i].date)}
          </text>
        ))}
        <TrackMarks x={(k) => x(idx(k))} y={(k) => y(series[idx(k)].nav)} hover={h?.date} pinA={pin ?? track.pinA} pinB={pin ? undefined : track.pinB} padT={pad} padB={row.extra + pad} H={H + row.extra} />
      </svg>
      {h && hover != null && (
        <TrackTip pos={track.pos}>
          <b>{fmt(h.nav)} FCFA</b>
          <span>
            {t("VL du")} {fmtDate(h.date)} · BOC n° {h.bulletinNo}
          </span>
          <span>
            {t("Variation")} <em className={(h.variationPct ?? (prev ? h.nav / prev.nav - 1 : 0)) >= 0 ? trackStyles.up : trackStyles.down}>{signed(h.variationPct ?? (prev ? (h.nav / prev.nav - 1) * 100 : undefined))}</em>
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
          {onRange && <small>{pin ? t("toucher pour fermer la période à cette date") : t("toucher deux dates pour recadrer la période")}</small>}
        </TrackTip>
      )}
      {pin && (
        <RangeRead onClear={() => setPin(null)} clearLabel={t("effacer")}>
          <b>{fmtDate(pin)}</b> : {t("touchez une seconde date pour recadrer la période")}
        </RangeRead>
      )}
    </div>
  );
}
