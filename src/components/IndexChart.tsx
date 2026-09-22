"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { fmtDate } from "@/lib/format";
import styles from "./IndexChart.module.css";

export interface ChartPoint {
  date: string;
  value: number;
  variationPct?: number;
  /** The shares that traded on that session (mnemo and variation), when the index moved. */
  movers?: { mnemo: string; variationPct: number }[];
}
export interface OverlaySeries {
  mnemo: string;
  name: string;
  points: { date: string; value: number }[];
}

type PeriodKey = "1m" | "3m" | "ytd" | "12m" | "all";
const PERIODS: [PeriodKey, string][] = [
  ["1m", "1 mois"],
  ["3m", "3 mois"],
  ["ytd", "Depuis le 1er janvier"],
  ["12m", "12 mois"],
  ["all", "Tout"],
];
const shift = (iso: string, days: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - days * 86400e3).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400e3);
const lvl = (v: number, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${lvl(v, d)} %`);

/**
 * The index, every session read, with a crosshair that follows the pointer,
 * points pinned by a tap (one, then two : the change between the dates), a
 * base-100 reading, one listed share overlaid on the same base, and the
 * sessions where the index moved marked and named. Sessions further than a
 * week apart are not joined : a missing bulletin is a gap, not a flat line.
 */
export function IndexChart({ points, overlays, defaultPeriod = "12m" }: { points: ChartPoint[]; overlays: OverlaySeries[]; defaultPeriod?: PeriodKey }) {
  const t = useT();
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const [rebase, setRebase] = useState(false);
  const [overlay, setOverlay] = useState("");
  const [hover, setHover] = useState<number | null>(null);
  const [pins, setPins] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(760);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = (width: number) => setW(Math.max(320, Math.floor(width)));
    measure(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((es) => measure(es[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 240 : 320;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 28;

  const last = points[points.length - 1];
  const from = useMemo(() => {
    if (!last) return "";
    if (period === "1m") return shift(last.date, 30);
    if (period === "3m") return shift(last.date, 91);
    if (period === "12m") return shift(last.date, 365);
    if (period === "ytd") return `${last.date.slice(0, 4)}-01-01`;
    return "";
  }, [period, last]);
  const pts = useMemo(() => points.filter((p) => p.date >= from), [points, from]);
  const ov = overlays.find((o) => o.mnemo === overlay);
  const ovPts = useMemo(() => (ov ? ov.points.filter((p) => p.date >= from) : []), [ov, from]);
  const showBase = rebase || Boolean(ov);
  const base = <P extends { date: string; value: number }>(arr: P[]): (P & { y: number })[] => {
    const b = arr[0]?.value;
    return b ? arr.map((p) => ({ ...p, y: (p.value / b) * 100 })) : [];
  };
  const series = useMemo(() => (showBase ? base(pts) : pts.map((p) => ({ ...p, y: p.value }))), [pts, showBase]);
  const ovSeries = useMemo(() => (ov ? base(ovPts) : []), [ovPts, ov]);
  if (!last || pts.length < 2) return <div className="empty">{t("Pas assez de séances lues sur cette période.")}</div>;

  const dates = pts.map((p) => p.date);
  const d0 = dates[0];
  const dN = dates[dates.length - 1];
  const span = Math.max(1, daysBetween(d0, dN));
  const x = (d: string) => padL + (daysBetween(d0, d) / span) * (W - padL - padR);
  const ys = [...series.map((p) => p.y), ...ovSeries.map((p) => p.y)];
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  const pad = (hi - lo || lo * 0.02 || 1) * 0.08;
  lo -= pad;
  hi += pad;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  // segments : break the line where two sessions are more than a week apart
  const segments = (arr: { date: string; y: number }[]) => {
    const out: string[] = [];
    let cur: string[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i > 0 && daysBetween(arr[i - 1].date, arr[i].date) > 7) {
        if (cur.length) out.push(cur.join(" "));
        cur = [];
      }
      cur.push(`${x(arr[i].date).toFixed(1)},${y(arr[i].y).toFixed(1)}`);
    }
    if (cur.length) out.push(cur.join(" "));
    return out;
  };
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  // date ticks : first, last and up to four in between at round months
  const dateTicks: string[] = [];
  {
    const step = Math.max(1, Math.round(span / 5));
    for (let d = 0; d <= span; d += step) dateTicks.push(shift(dN, span - d));
  }
  const nearest = (clientX: number, svg: SVGSVGElement) => {
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    let best = 0;
    let bd = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(x(p.date) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  const togglePin = (date: string) => {
    setPins((cur) => (cur.includes(date) ? cur.filter((d) => d !== date) : cur.length >= 2 ? [date] : [...cur, date].sort()));
  };
  const at = (d: string) => pts.find((p) => p.date === d);
  const hp = hover != null ? pts[hover] : undefined;
  const sInfo = (d: string) => series.find((p) => p.date === d);
  const oInfo = (d: string) => ovSeries.filter((p) => p.date <= d).pop();
  const pinA = pins[0] ? at(pins[0]) : undefined;
  const pinB = pins[1] ? at(pins[1]) : undefined;
  const between = pinA && pinB ? pts.filter((p) => p.date > pinA.date && p.date <= pinB.date) : [];
  const moved = between.filter((p) => (p.variationPct ?? 0) !== 0).length;
  const tipX = hp ? x(hp.date) : 0;
  const tipLeft = tipX > W * 0.6;

  return (
    <div className={styles.wrap} ref={boxRef}>
      <div className={styles.bar}>
        <div className={styles.pills} role="tablist" aria-label={t("Période")}>
          {PERIODS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={period === k} onClick={() => setPeriod(k)}>
              {t(label)}
            </button>
          ))}
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={showBase} disabled={Boolean(ov)} onChange={(e) => setRebase(e.target.checked)} /> {t("base 100")}
        </label>
        <label className={styles.select}>
          {t("Comparer à")}
          <select value={overlay} onChange={(e) => setOverlay(e.target.value)}>
            <option value="">{t("aucune valeur")}</option>
            {overlays.map((o) => (
              <option key={o.mnemo} value={o.mnemo}>
                {o.mnemo} · {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label={t("Indice BVMAC All Share, {n} séances du {a} au {b}", { n: String(pts.length), a: fmtDate(d0), b: fmtDate(dN) })}
        onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => togglePin(pts[nearest(e.clientX, e.currentTarget)].date)}
      >
        {tickVals.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
              {showBase ? lvl(v, 0) : lvl(v, 0)}
            </text>
          </g>
        ))}
        {dateTicks.map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor={d === d0 ? "start" : d === dN ? "end" : "middle"} className={styles.tick}>
            {fmtDate(d)}
          </text>
        ))}
        {showBase && <line x1={padL} x2={W - padR} y1={y(100)} y2={y(100)} className={styles.baseLine} />}
        {segments(ovSeries).map((s, i) => (
          <polyline key={`o${i}`} points={s} className={styles.overlay} />
        ))}
        {segments(series).map((s, i) => (
          <polyline key={i} points={s} className={styles.line} />
        ))}
        {series
          .filter((p) => (p.variationPct ?? 0) !== 0)
          .map((p) => (
            <circle key={p.date} cx={x(p.date)} cy={y(p.y)} r={3.5} className={(p.variationPct ?? 0) > 0 ? styles.up : styles.down}>
              <title>
                {fmtDate(p.date)} · {signed(p.variationPct)} {p.movers?.length ? `· ${p.movers.map((m) => `${m.mnemo} ${signed(m.variationPct)}`).join(", ")}` : ""}
              </title>
            </circle>
          ))}
        {pins.map((d) => {
          const s = sInfo(d);
          return s ? (
            <g key={d} className={styles.pin}>
              <line x1={x(d)} x2={x(d)} y1={padT} y2={H - padB} />
              <circle cx={x(d)} cy={y(s.y)} r={5} />
            </g>
          ) : null;
        })}
        {pinA && pinB && <rect x={x(pinA.date)} y={padT} width={Math.max(0, x(pinB.date) - x(pinA.date))} height={H - padT - padB} className={styles.range} />}
        {hp && (
          <g className={styles.cross}>
            <line x1={x(hp.date)} x2={x(hp.date)} y1={padT} y2={H - padB} />
            <circle cx={x(hp.date)} cy={y(sInfo(hp.date)!.y)} r={4} />
          </g>
        )}
      </svg>
      {hp && (
        <div className={`${styles.tip} ${tipLeft ? styles.tipLeft : ""}`} style={{ left: `${(tipX / W) * 100}%` }}>
          <b>{fmtDate(hp.date)}</b>
          <span>
            {lvl(hp.value)} <em className={(hp.variationPct ?? 0) > 0 ? styles.upT : (hp.variationPct ?? 0) < 0 ? styles.downT : ""}>{signed(hp.variationPct)}</em>
          </span>
          {showBase && <span>{t("base 100")} : {lvl(sInfo(hp.date)!.y, 1)}</span>}
          {ov && oInfo(hp.date) && (
            <span>
              {ov.mnemo} : {lvl(oInfo(hp.date)!.y, 1)}
            </span>
          )}
          <span className={styles.tipSince}>
            {t("depuis le {d}", { d: fmtDate(d0) })} : {signed(((hp.value - pts[0].value) / pts[0].value) * 100)}
          </span>
          {hp.movers?.length ? <span className={styles.tipMovers}>{hp.movers.map((m) => `${m.mnemo} ${signed(m.variationPct)}`).join(" · ")}</span> : null}
        </div>
      )}
      <div className={styles.pinsBar}>
        <label>
          {t("Du")}
          <input type="date" value={pins[0] ?? ""} min={d0} max={dN} onChange={(e) => setPins((cur) => (e.target.value ? [e.target.value, ...cur.slice(1)].sort() : cur.slice(1)))} />
        </label>
        <label>
          {t("Au")}
          <input type="date" value={pins[1] ?? ""} min={d0} max={dN} onChange={(e) => setPins((cur) => (e.target.value ? [cur[0] ?? d0, e.target.value].sort() : cur.slice(0, 1)))} />
        </label>
        {pinA && pinB ? (
          <p className={styles.pinsRead}>
            <b>
              {fmtDate(pinA.date)} → {fmtDate(pinB.date)}
            </b>{" "}
            : {lvl(pinA.value)} → {lvl(pinB.value)}, <b className={pinB.value >= pinA.value ? styles.upT : styles.downT}>{signed(((pinB.value - pinA.value) / pinA.value) * 100)}</b> · {t("{n} séances, {m} avec mouvement", { n: String(between.length), m: String(moved) })}
            <button type="button" className={styles.clear} onClick={() => setPins([])}>
              {t("effacer")}
            </button>
          </p>
        ) : pinA ? (
          <p className={styles.pinsRead}>
            <b>{fmtDate(pinA.date)}</b> : {lvl(pinA.value)} · {t("touchez une seconde date pour lire l'écart")}
            <button type="button" className={styles.clear} onClick={() => setPins([])}>
              {t("effacer")}
            </button>
          </p>
        ) : (
          <p className={styles.pinsRead}>{t("Survolez pour lire une séance ; touchez deux points (ou choisissez deux dates) pour lire l'écart entre eux. Les points colorés sont les séances où l'indice a bougé.")}</p>
        )}
      </div>
    </div>
  );
}
