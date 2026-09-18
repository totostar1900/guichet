"use client";

import { useRef, useState } from "react";
import { axisLabel, type NavPoint } from "./NavChart";
import { daysBetween } from "@/lib/finance";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./QuoteHistory.module.css";
import { useT } from "@/i18n/client";

/**
 * The four readings of a fund beyond its NAV, all computed from the published
 * NAVs alone: the rolling annualised return, the value of a reference amount,
 * the change at each NAV, and the drawdown from the running high. One SVG
 * frame, one hover bubble, the same period as the NAV chart.
 */
export type ChartMode = "vl" | "rendement" | "placement" | "variations" | "repli";
export interface Benchmark {
  label: string; // "BTA 52 sem."
  pct: number; // annual rate, in %
}
export const REF_AMOUNT = 1_000_000;

export interface SeriesPoint {
  date: string;
  y: number; // the plotted value
  nav: number;
  bulletinNo: number;
  from?: string; // rendement: start of the rolling window
}

const signed = (v?: number, d = 2) => (v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

/** Rolling annualised return: at each NAV, the return over the `days` before it, annualised. Needs the whole history. */
export function rollingAnnualised(all: NavPoint[], days: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    // the latest NAV at or before the start of the window
    let j = -1;
    for (let k = i - 1; k >= 0; k--) {
      if (daysBetween(all[k].date, p.date) >= days) {
        j = k;
        break;
      }
    }
    if (j < 0) continue;
    const base = all[j];
    const span = daysBetween(base.date, p.date);
    if (base.nav <= 0 || span < days * 0.8) continue;
    out.push({ date: p.date, y: (Math.pow(p.nav / base.nav, 365 / span) - 1) * 100, nav: p.nav, bulletinNo: p.bulletinNo, from: base.date });
  }
  return out;
}

export function invested(window: NavPoint[]): SeriesPoint[] {
  const first = window[0]?.nav ?? 0;
  return first > 0 ? window.map((p) => ({ date: p.date, y: (REF_AMOUNT * p.nav) / first, nav: p.nav, bulletinNo: p.bulletinNo })) : [];
}

export function changes(window: NavPoint[]): SeriesPoint[] {
  return window.slice(1).map((p, i) => ({ date: p.date, y: window[i].nav > 0 ? (p.nav / window[i].nav - 1) * 100 : 0, nav: p.nav, bulletinNo: p.bulletinNo, from: window[i].date }));
}

export function drawdown(window: NavPoint[]): SeriesPoint[] {
  let peak = 0;
  return window.map((p) => {
    peak = Math.max(peak, p.nav);
    return { date: p.date, y: peak > 0 ? (p.nav / peak - 1) * 100 : 0, nav: p.nav, bulletinNo: p.bulletinNo };
  });
}

export function FundChart({ mode, series, benchmark, windowDays }: { mode: Exclude<ChartMode, "vl">; series: SeriesPoint[]; benchmark?: Benchmark; windowDays?: number }) {
  const t = useT();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = 96;
  const pad = 6;
  const n = series.length;
  const ys = series.map((p) => p.y);
  // Reference line for the two « gain » charts: the benchmark rate, or the same amount growing at that rate.
  const bench = benchmark && mode === "rendement" ? series.map(() => benchmark.pct) : benchmark && mode === "placement" && n > 0 ? series.map((p) => REF_AMOUNT * (1 + (benchmark.pct / 100) * (daysBetween(series[0].date, p.date) / 365))) : null;
  const allY = [...ys, ...(bench ?? []), ...(mode === "variations" || mode === "repli" || mode === "rendement" ? [0] : [])];
  let min = Math.min(...allY);
  let max = Math.max(...allY);
  if (max === min) {
    max += 1;
    min -= 1;
  }
  const fmtY = (v: number) => (mode === "placement" ? fmt(v) : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
  const padX = Math.max(fmtY(max).length, fmtY(min).length) * 3.6 + 8; // the left margin follows the width of the two labels
  const x = (i: number) => (n === 1 ? W / 2 : padX + (i * (W - padX - pad)) / (n - 1));
  const y = (v: number) => H - pad - ((v - min) * (H - 2 * pad)) / (max - min);
  const line = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");
  const zero = y(Math.max(min, Math.min(max, 0)));
  const axis = axisLabel(series.map((p) => p.date));
  const last = n - 1;

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el || n === 0) return;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i;
    setHover(best);
  };
  const h = hover == null ? null : series[hover];
  if (n === 0) return <div className="empty">{t(mode === "rendement" ? "Pas assez d'historique pour une fenêtre de {n} jours." : "Aucune VL publiée sur cette période.", { n: windowDays ?? 365 })}</div>;

  return (
    <div className={styles.navChart}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label={t(MODE_LABEL[mode])} onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)} onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)}>
        <line x1={padX} x2={W - pad} y1={y(max)} y2={y(max)} className={styles.guide} />
        <line x1={padX} x2={W - pad} y1={y(min)} y2={y(min)} className={styles.guide} />
        <text x={padX - 4} y={y(max) + 3} className={styles.tick} textAnchor="end">
          {fmtY(max)}
        </text>
        <text x={padX - 4} y={y(min) + 3} className={styles.tick} textAnchor="end">
          {fmtY(min)}
        </text>
        {min < 0 && max > 0 && <line x1={padX} x2={W - pad} y1={zero} y2={zero} className={styles.zero} />}
        {bench && <path d={series.map((_, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(bench[i]).toFixed(1)}`).join(" ")} className={styles.bench} />}
        {mode === "variations" ? (
          series.map((p, i) => {
            const w = Math.max(1.2, Math.min(6, ((W - padX - pad) / n) * 0.7));
            const top = Math.min(y(p.y), zero);
            const hgt = Math.max(0.8, Math.abs(y(p.y) - zero));
            return <rect key={p.date} x={x(i) - w / 2} y={top} width={w} height={hgt} className={`${p.y < 0 ? styles.barDown : styles.barUp} ${i === hover ? styles.barOn : ""}`} />;
          })
        ) : mode === "repli" ? (
          <>
            <path d={`${line} L${x(last).toFixed(1)} ${zero} L${x(0).toFixed(1)} ${zero} Z`} className={styles.areaDown} />
            <path d={line} className={styles.lineDown} />
          </>
        ) : (
          <>
            <path d={`${line} L${x(last).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`} className={styles.area} />
            <path d={line} className={styles.line} />
            <circle cx={x(last)} cy={y(series[last].y)} r={3.5} className={styles.dot} />
          </>
        )}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad} y2={H - pad} className={styles.cursor} />}
        {hover != null && mode !== "variations" && <circle cx={x(hover)} cy={y(series[hover].y)} r={4} className={styles.dot} />}
        {axis.ticks.map((i) => (
          <text key={i} x={x(i)} y={H + 11} className={styles.tick} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}>
            {axis.label(series[i].date)}
          </text>
        ))}
      </svg>
      {bench && benchmark && (
        <div className={styles.keys}>
          <span>
            <i className={styles.keyLine}>—</i> {t("ce fonds")}
          </span>
          <span>
            <i className={styles.keyBench}>┄</i> {benchmark.label} · {fmtPct(benchmark.pct, 2)} {t(mode === "rendement" ? "par an" : "par an, le même montant placé au même taux")}
          </span>
        </div>
      )}
      {h && hover != null && (
        <div className={`${styles.tip} ${y(h.y) < H * 0.45 ? styles.tipBelow : ""} ${x(hover) > W * 0.72 ? styles.tipLeft : x(hover) < W * 0.28 ? styles.tipRight : ""}`} style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.y) / (H + 14)) * 100}%` }} role="status">
          {mode === "rendement" && (
            <>
              <b>{signed(h.y)} {t("par an")}</b>
              <span>
                {t("du")} {fmtDate(h.from ?? h.date, false)} {t("au")} {fmtDate(h.date)}
              </span>
              {benchmark && (
                <span>
                  {benchmark.label} {fmtPct(benchmark.pct, 2)} · {t("écart")} {signed(h.y - benchmark.pct)}
                </span>
              )}
            </>
          )}
          {mode === "placement" && (
            <>
              <b>{fmt(h.y)} FCFA</b>
              <span>
                {t("le")} {fmtDate(h.date)} · {signed((h.y / REF_AMOUNT - 1) * 100)}
              </span>
              {bench && (
                <span>
                  {benchmark?.label} : {fmt(bench[hover])} FCFA
                </span>
              )}
            </>
          )}
          {mode === "variations" && (
            <>
              <b>{signed(h.y)}</b>
              <span>
                {t("VL du")} {fmtDate(h.date)} · {fmt(h.nav)} FCFA
              </span>
              <span>
                {t("depuis le")} {fmtDate(h.from ?? h.date, false)} · BOC n° {h.bulletinNo}
              </span>
            </>
          )}
          {mode === "repli" && (
            <>
              <b>{h.y === 0 ? t("au plus haut") : signed(h.y)}</b>
              <span>
                {t("VL du")} {fmtDate(h.date)} · {fmt(h.nav)} FCFA
              </span>
              <span>{t("écart au plus haut atteint avant cette date")}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const MODE_LABEL: Record<ChartMode, string> = {
  vl: "VL",
  rendement: "Rendement annualisé",
  placement: "1 000 000 FCFA placés",
  variations: "Variations",
  repli: "Repli",
};
