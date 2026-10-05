"use client";

import { useCallback, useRef, useState } from "react";
import { useOutsideTap } from "./chart-utils";
import { type Lu, RangeRead, TrackBand, TrackMarks, togglePin, trackStyles, useTracker } from "./charts/tracker";
import styles from "./Charts.module.css";
import { useT } from "@/i18n/client";

/**
 * Small SVG charts with a tracker: move over the chart and the nearest point or
 * bar is highlighted with its numbers. No library; theme tokens for colour.
 */

export const fmtShort = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md`;
  if (a >= 1e6) return `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M`;
  if (a >= 1e3) return `${(v / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`;
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
};
const full = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const frDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function niceTicks(min: number, max: number, n = 4): number[] {
  if (max === min) return [min];
  const raw = (max - min) / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/**
 * Closing prices over time; flat segments stay flat (the BVMAC prints the last
 * price every session). Tracked : the crosshair reads a session, two taps pin a
 * range and read the change between the dates.
 */
export function LineChart({ points, unit = "FCFA", height = 220, ariaLabel }: { points: { date: string; value: number; extra?: string; volume?: number; amount?: number }[]; unit?: string; height?: number; ariaLabel: string }) {
  const tr = useT();
  const [pins, setPins] = useState<string[]>([]);
  const W = 720;
  const H = height;
  const padL = 56;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const vals = points.map((p) => p.value);
  let min = points.length ? Math.min(...vals) : 0;
  let max = points.length ? Math.max(...vals) : 1;
  if (max === min) {
    min = min * 0.97;
    max = max * 1.03;
  }
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;
  const x = (i: number) => (points.length === 1 ? W / 2 : padL + (i * (W - padL - padR)) / Math.max(1, points.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
  const keys = points.map((p) => p.date);
  const track = useTracker({ keys, x, W, pins, onPin: (k) => setPins((cur) => togglePin(cur, k)) });
  if (points.length === 0) return <div className={styles.empty}>{tr("Pas encore de cours sur cette période.")}</div>;
  const ticks = niceTicks(min, max, 4);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${d} L${x(points.length - 1).toFixed(1)} ${(H - padB).toFixed(1)} L${x(0).toFixed(1)} ${(H - padB).toFixed(1)} Z`;
  const last = points[points.length - 1];
  const up = last.value >= points[0].value;
  const labelIdx = points.length > 2 ? [0, Math.floor(points.length / 2), points.length - 1] : points.map((_, i) => i);
  const idx = (k: string) => keys.indexOf(k);
  const h = track.hover != null ? points[track.hover] : null;
  const prev = track.hover != null && track.hover > 0 ? points[track.hover - 1] : null;
  const pA = track.pinA ? points[idx(track.pinA)] : undefined;
  const pB = track.pinB ? points[idx(track.pinB)] : undefined;
  const between = pA && pB ? points.slice(idx(pA.date), idx(pB.date) + 1) : [];
  const amountBetween = between.slice(1).reduce((s, p) => s + (p.amount ?? 0), 0);
  const volumeBetween = between.slice(1).reduce((s, p) => s + (p.volume ?? 0), 0);
  const ecart = (de: number, a: number) => <em className={a >= de ? trackStyles.up : trackStyles.down}>{pct(de ? ((a - de) / Math.abs(de)) * 100 : 0)}</em>;
  /* LE BANDEAU DIT TROIS CHOSES, DANS CET ORDRE : le point sous le doigt, sinon
     la période épinglée, sinon le dernier cours. L'ordre compte : une lecture en
     cours passe devant une épingle posée avant elle. */
  const lu: Lu = h
    ? {
        quand: frDate(h.date),
        dit: tr("séance lue"),
        valeur: `${full(h.value)} ${unit}`,
        sous: h.volume != null ? (h.volume ? `${full(h.volume)} ${tr("titres")} · ${fmtShort(h.amount ?? 0)} FCFA` : tr("aucun échange")) : h.extra,
        droite: [
          prev ? (
            <>
              {tr("séance précédente")} {ecart(prev.value, h.value)}
            </>
          ) : null,
          <>
            {tr("début de période")} {ecart(points[0].value, h.value)}
          </>,
        ].filter((n): n is React.ReactElement => n !== null),
      }
    : pA && pB
      ? {
          quand: `${frDate(pA.date)} → ${frDate(pB.date)}`,
          dit: tr("période épinglée"),
          valeur: ecart(pA.value, pB.value),
          sous: `${full(pA.value)} → ${full(pB.value)} ${unit}`,
          droite: [`${between.length} ${tr("séances")}`],
        }
      : {
          quand: frDate(last.date),
          dit: tr("dernier cours"),
          valeur: `${full(last.value)} ${unit}`,
          droite: [
            <>
              {tr("début de période")} {ecart(points[0].value, last.value)}
            </>,
          ],
        };
  return (
    <div className={styles.wrapRel}>
      <TrackBand lu={lu} onClear={pA ? () => setPins([]) : undefined} clearLabel={tr("effacer")} />
      <svg viewBox={`0 0 ${W} ${H}`} className={`${styles.svg} ${trackStyles.track}`} role="img" aria-label={ariaLabel} {...track.handlers}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={styles.grid} />
            <text x={padL - 8} y={y(t) + 4} className={styles.tick} textAnchor="end">
              {fmtShort(t)}
            </text>
          </g>
        ))}
        <path d={area} className={up ? styles.areaUp : styles.areaDown} />
        <path d={d} className={up ? styles.lineUp : styles.lineDown} />
        {h == null && <circle cx={x(points.length - 1)} cy={y(last.value)} r={4} className={up ? styles.dotUp : styles.dotDown} />}
        {h == null && (
          <text x={Math.min(x(points.length - 1), W - padR - 70)} y={y(last.value) - 10} className={styles.lastLabel} textAnchor="end">
            {fmtShort(last.value)} {unit}
          </text>
        )}
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} className={styles.tick} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
            {frDate(points[i].date)}
          </text>
        ))}
        <TrackMarks x={(k) => x(idx(k))} y={(k) => y(points[idx(k)].value)} hover={h?.date} pinA={track.pinA} pinB={track.pinB} padT={padT} padB={padB} H={H} />
      </svg>
      {pA && pB && volumeBetween ? (
        <RangeRead clearLabel={tr("effacer")}>
          {tr("échangé sur la période")} : {full(volumeBetween)} {tr("titres")} · {fmtShort(amountBetween)} FCFA
        </RangeRead>
      ) : pA && !pB ? (
        <RangeRead onClear={() => setPins([])} clearLabel={tr("effacer")}>
          <b>{frDate(pA.date)}</b> {tr("est épinglée")} · {tr("touchez une seconde date pour lire l'écart")}
        </RangeRead>
      ) : null}
    </div>
  );
}

/** Uses the SVG's own coordinate space so the bar tracker works whatever the rendered size. */
function svgX(e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>, svg: SVGSVGElement, W: number): number {
  const rect = svg.getBoundingClientRect();
  const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
  return ((clientX - rect.left) / rect.width) * W;
}

/** Grouped bars per year (e.g. revenue and net income). Values in FCFA. */
export function BarChart({ groups, series, height = 220, ariaLabel }: { groups: string[]; series: { name: string; values: number[]; accent?: boolean }[]; height?: number; ariaLabel: string }) {
  const t = useT();
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  useOutsideTap(ref, hover != null, useCallback(() => setHover(null), []));
  const W = 720;
  const H = height;
  const padL = 56;
  const padR = 12;
  const padT = 14;
  const padB = 44;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(0, ...all);
  const min = Math.min(0, ...all);
  const ticks = niceTicks(min, max, 4);
  const top = Math.max(max, ticks[ticks.length - 1]);
  const bottom = Math.min(min, ticks[0]);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - bottom) / (top - bottom || 1));
  const gw = (W - padL - padR) / groups.length;
  const bw = Math.min(40, (gw * 0.7) / series.length);
  const onMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!ref.current) return;
    const px = svgX(e, ref.current, W);
    const i = Math.floor((px - padL) / gw);
    setHover(i >= 0 && i < groups.length ? i : null);
  };
  /* Les barres suivent la même règle que les courbes : l'exercice sous le
     doigt, sinon le dernier. Le point n'est pas une date mais une année, et
     chaque série prend une ligne avec la pastille de sa barre. */
  const gi = hover ?? groups.length - 1;
  const luB: Lu = {
    quand: groups[gi] ?? "",
    dit: hover != null ? t("exercice lu") : t("dernier exercice"),
    series: series.map((s) => ({
      couleur: s.accent ? "var(--chart-in)" : "var(--chart-out)",
      nom: s.name,
      valeur: `${fmtShort(s.values[gi] ?? 0)} FCFA`,
    })),
    droite:
      gi > 0 && series[0]?.values[gi - 1]
        ? [
            <>
              {t("sur un an")} <em className={(series[0].values[gi] ?? 0) >= (series[0].values[gi - 1] ?? 0) ? trackStyles.up : trackStyles.down}>{pct((((series[0].values[gi] ?? 0) - (series[0].values[gi - 1] ?? 0)) / Math.abs(series[0].values[gi - 1] ?? 1)) * 100)}</em>
            </>,
          ]
        : undefined,
  };
  return (
    <div className={styles.wrapRel}>
      <TrackBand lu={luB} />
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={ariaLabel} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchStart={onMove} onTouchMove={onMove}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={t === 0 ? styles.axis : styles.grid} />
            <text x={padL - 8} y={y(t) + 4} className={styles.tick} textAnchor="end">
              {fmtShort(t)}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => (
          <g key={g} className={hover != null && hover !== gi ? styles.dim : undefined}>
            {hover === gi && <rect x={padL + gi * gw} y={padT} width={gw} height={H - padT - padB} className={styles.band} />}
            {series.map((s, si) => {
              const v = s.values[gi] ?? 0;
              const x0 = padL + gi * gw + (gw - bw * series.length) / 2 + si * bw;
              const yTop = y(Math.max(v, 0));
              const hh = Math.abs(y(v) - y(0));
              return (
                <g key={s.name}>
                  <rect x={x0 + 1} y={yTop} width={bw - 2} height={Math.max(hh, 1)} rx={3} className={s.accent ? styles.barAccent : styles.bar} />
                  {series.length <= 2 && (
                    <text x={x0 + bw / 2} y={yTop - 5} className={styles.value} textAnchor="middle">
                      {fmtShort(v)}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={padL + gi * gw + gw / 2} y={H - 26} className={styles.tickStrong} textAnchor="middle">
              {g}
            </text>
          </g>
        ))}
        {series.map((s, si) => (
          <g key={s.name} transform={`translate(${padL + si * 170}, ${H - 8})`}>
            <rect width={10} height={10} y={-9} rx={2} className={s.accent ? styles.barAccent : styles.bar} />
            <text x={14} className={styles.tick}>
              {s.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Horizontal share of capital. */
export function ShareBar({ parts }: { parts: { name: string; pct: number }[] }) {
  const tr = useT();
  const total = parts.reduce((s, p) => s + p.pct, 0);
  const rest = Math.max(0, 100 - total);
  const all = rest > 0.05 ? [...parts, { name: tr("Flottant et autres"), pct: rest }] : parts;
  return (
    <div className={styles.shareWrap}>
      <div className={styles.shareBar} role="img" aria-label={all.map((p) => `${p.name} ${p.pct} %`).join(", ")}>
        {all.map((p, i) => (
          <span key={p.name} className={styles[`seg${i % 5}`]} style={{ width: `${p.pct}%` }} title={`${p.name} · ${p.pct} %`} />
        ))}
      </div>
      <ul className={styles.shareLegend}>
        {all.map((p, i) => (
          <li key={p.name}>
            <i className={styles[`seg${i % 5}`]} /> {p.name} <b>{p.pct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
