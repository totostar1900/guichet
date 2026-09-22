"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useT } from "@/i18n/client";
import { fmt, fmtDate, money } from "@/lib/format";
import styles from "./IndexChart.module.css";

export interface ChartPoint {
  date: string;
  value: number;
  variationPct?: number;
  /** The shares that traded on that session (mnemo and variation), when the index moved. */
  movers?: { mnemo: string; variationPct: number }[];
  /** Equity trading of the session, all shares: titles, FCFA, number of trades. */
  titles?: number;
  amount?: number;
  trades?: number;
}
export interface OverlaySeries {
  mnemo: string;
  name: string;
  points: { date: string; value: number; titles?: number; amount?: number; trades?: number; variationPct?: number }[];
  /** Shares in issue and in public hands (the last count read), so a capitalisation exists for every session. */
  sharesTotal?: number;
  sharesFloat?: number;
}

export type IndexView = "niveau" | "volumes" | "contributions" | "calendrier" | "societes" | "capitalisation" | "flottant";
type PeriodKey = "1m" | "3m" | "ytd" | "12m" | "all";
type VolumeKey = "amount" | "titles" | "trades";
type Marks = "ligne" | "ligne_points" | "points";
const PERIODS: [PeriodKey, string][] = [
  ["1m", "1 mois"],
  ["3m", "3 mois"],
  ["ytd", "Depuis le 1er janvier"],
  ["12m", "12 mois"],
  ["all", "Tout"],
];
const VIEWS: [IndexView, string][] = [
  ["niveau", "Niveau"],
  ["volumes", "Niveau + volumes"],
  ["contributions", "Contributions"],
  ["calendrier", "Calendrier"],
  ["societes", "Sociétés en base 100"],
  ["capitalisation", "Capitalisation"],
  ["flottant", "Flottant"],
];
const shift = (iso: string, days: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - days * 86400e3).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400e3);
const lvl = (v: number, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${lvl(v, d)} %`);

/**
 * The index, every session read, under one selector of views: the level
 * (crosshair, pins, base 100, one share overlaid), the level with the
 * session's trading as bars, the calendar of a year of sessions, and the
 * listed shares as small charts against the index. Sessions further than
 * a week apart are not joined : a missing bulletin is a gap, not a line.
 */
export function IndexChart({ points, overlays, defaultPeriod = "12m" }: { points: ChartPoint[]; overlays: OverlaySeries[]; defaultPeriod?: PeriodKey }) {
  const t = useT();
  const [view, setView] = useState<IndexView>("niveau");
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const [rebase, setRebase] = useState(false);
  const [overlay, setOverlay] = useState("");
  const [volKey, setVolKey] = useState<VolumeKey>("amount");
  const [volOf, setVolOf] = useState("");
  const [hover, setHover] = useState<number | null>(null);
  const [pins, setPins] = useState<string[]>([]);
  const [marks, setMarks] = useState<Marks>("ligne_points");
  // the company dimension of the calendar, the capitalisation and the float
  const [company, setCompany] = useState("");
  const co = overlays.find((o) => o.mnemo === company);
  // touch : the first tap shows the reading, the second on the same point pins it
  const touchRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number; above: boolean } | null>(null);
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
  const withVol = view === "volumes";
  const volH = withVol ? (W < 480 ? 70 : 90) : 0;
  const H = (W < 480 ? 240 : 320) + volH;
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
  // the trading of each session, all shares or one
  const volSrc = overlays.find((o) => o.mnemo === volOf);
  const volAt = (date: string): number => {
    if (volSrc) {
      const q = volSrc.points.find((p) => p.date === date);
      return q?.[volKey] ?? 0;
    }
    const p = pts.find((q) => q.date === date);
    return p?.[volKey] ?? 0;
  };
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
  const plotB = H - padB - volH;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (plotB - padT);
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
  const dateTicks: string[] = [];
  {
    const step = Math.max(1, Math.round(span / 5));
    for (let d = 0; d <= span; d += step) dateTicks.push(shift(dN, span - d));
  }
  const vols = pts.map((p) => volAt(p.date));
  const volMax = Math.max(1, ...vols);
  const volLabel = (v: number) => (volKey === "amount" ? money(v) : fmt(v));
  const totals = { titles: pts.reduce((a, p) => a + (p.titles ?? 0), 0), amount: pts.reduce((a, p) => a + (p.amount ?? 0), 0), trades: pts.reduce((a, p) => a + (p.trades ?? 0), 0), moved: pts.filter((p) => (p.variationPct ?? 0) !== 0).length };
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
  const togglePin = (date: string) => setPins((cur) => (cur.includes(date) ? cur.filter((d) => d !== date) : cur.length >= 2 ? [date] : [...cur, date].sort()));
  const at = (d: string) => pts.find((p) => p.date === d);
  const hp = hover != null ? pts[hover] : undefined;
  const sInfo = (d: string) => series.find((p) => p.date === d);
  const oInfo = (d: string) => ovSeries.filter((p) => p.date <= d).pop();
  const pinA = pins[0] ? at(pins[0]) : undefined;
  const pinB = pins[1] ? at(pins[1]) : undefined;
  const between = pinA && pinB ? pts.filter((p) => p.date > pinA.date && p.date <= pinB.date) : [];
  const moved = between.filter((p) => (p.variationPct ?? 0) !== 0).length;
  const lineView = view === "niveau" || view === "volumes";
  const placeTip = (i: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = r.left + (x(pts[i].date) / W) * r.width;
    const py = r.top + (y(series[i].y) / H) * r.height;
    const half = 120;
    const cx = Math.min(window.innerWidth - half - 8, Math.max(half + 8, px));
    const above = py + 170 > window.innerHeight;
    setTipPos({ x: cx, y: above ? py - 12 : py + 14, above });
  };
  const hoverAt = (i: number) => {
    setHover(i);
    placeTip(i);
  };
  const onSvgClick = (clientX: number, svg: SVGSVGElement) => {
    const i = nearest(clientX, svg);
    if (touchRef.current && hover !== i) {
      hoverAt(i);
      return;
    }
    togglePin(pts[i].date);
  };

  return (
    <div className={styles.wrap} ref={boxRef}>
      <div className={styles.views} role="tablist" aria-label={t("Vue")}>
        {VIEWS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}>
            {t(label)}
          </button>
        ))}
      </div>
      <div className={styles.bar}>
        <div className={styles.pills} role="tablist" aria-label={t("Période")}>
          {PERIODS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={period === k} onClick={() => setPeriod(k)}>
              {t(label)}
            </button>
          ))}
        </div>
        {lineView && (
          <>
            <label className={styles.check}>
              <input type="checkbox" checked={showBase} disabled={Boolean(ov)} onChange={(e) => setRebase(e.target.checked)} /> {t("base 100")}
            </label>
            <label className={styles.select}>
              {t("Tracé")}
              <select value={marks} onChange={(e) => setMarks(e.target.value as Marks)}>
                <option value="ligne">{t("ligne")}</option>
                <option value="ligne_points">{t("ligne et points")}</option>
                <option value="points">{t("points")}</option>
              </select>
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
          </>
        )}
        {(view === "calendrier" || view === "capitalisation" || view === "flottant") && (
          <label className={styles.select}>
            {t("Société")}
            <select value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="">{view === "capitalisation" ? t("toutes, empilées") : t("toutes les sociétés")}</option>
              {overlays.map((o) => (
                <option key={o.mnemo} value={o.mnemo}>
                  {o.mnemo} · {o.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {withVol && (
          <>
            <label className={styles.select}>
              {t("Volumes")}
              <select value={volKey} onChange={(e) => setVolKey(e.target.value as VolumeKey)}>
                <option value="amount">{t("montant échangé (FCFA)")}</option>
                <option value="titles">{t("titres échangés")}</option>
                <option value="trades">{t("nombre de transactions")}</option>
              </select>
            </label>
            <label className={styles.select}>
              <select value={volOf} onChange={(e) => setVolOf(e.target.value)} aria-label={t("Société")}>
                <option value="">{t("toutes les sociétés")}</option>
                {overlays.map((o) => (
                  <option key={o.mnemo} value={o.mnemo}>
                    {o.mnemo} · {o.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {lineView && (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className={styles.svg}
            role="img"
            aria-label={t("Indice BVMAC All Share, {n} séances du {a} au {b}", { n: String(pts.length), a: fmtDate(d0), b: fmtDate(dN) })}
            ref={svgRef}
            onPointerDown={(e) => {
              touchRef.current = e.pointerType === "touch";
            }}
            onPointerMove={(e) => {
              if (e.pointerType !== "touch") hoverAt(nearest(e.clientX, e.currentTarget));
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "touch") setHover(null);
            }}
            onClick={(e) => onSvgClick(e.clientX, e.currentTarget)}
          >
            {tickVals.map((v) => (
              <g key={v}>
                <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={styles.grid} />
                <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
                  {lvl(v, 0)}
                </text>
              </g>
            ))}
            {dateTicks.map((d) => (
              <text key={d} x={x(d)} y={H - 8} textAnchor={d === d0 ? "start" : d === dN ? "end" : "middle"} className={styles.tick}>
                {fmtDate(d)}
              </text>
            ))}
            {showBase && <line x1={padL} x2={W - padR} y1={y(100)} y2={y(100)} className={styles.baseLine} />}
            {withVol && (
              <g>
                <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} className={styles.grid} />
                <text x={padL - 6} y={H - padB - volH + 12} textAnchor="end" className={styles.tick}>
                  {volLabel(volMax)}
                </text>
                <text x={padL - 6} y={H - padB} textAnchor="end" className={styles.tick}>
                  0
                </text>
                {pts.map((p, i) => {
                  const v = vols[i];
                  if (!v) return null;
                  const h = (v / volMax) * (volH - 16);
                  const bw = Math.max(1.5, Math.min(6, ((W - padL - padR) / Math.max(1, pts.length)) * 0.7));
                  return <rect key={p.date} x={x(p.date) - bw / 2} y={H - padB - h} width={bw} height={h} className={`${styles.vol} ${(p.variationPct ?? 0) !== 0 ? styles.volMoved : ""}`} />;
                })}
              </g>
            )}
            {segments(ovSeries).map((s, i) => (
              <polyline key={`o${i}`} points={s} className={styles.overlay} />
            ))}
            {marks !== "points" &&
              segments(series).map((s, i) => (
                <polyline key={i} points={s} className={styles.line} />
              ))}
            {marks !== "ligne" && series.map((p) => <circle key={`m${p.date}`} cx={x(p.date)} cy={y(p.y)} r={marks === "points" ? 2.4 : 1.6} className={styles.dot} />)}
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
          {hp && tipPos && (
            <div className={`${styles.tip} ${tipPos.above ? styles.tipAbove : ""}`} style={{ left: tipPos.x, top: tipPos.y }}>
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
              <span className={styles.tipSince}>
                {hp.titles ? `${fmt(hp.titles)} ${t("titres")} · ${money(hp.amount ?? 0)} FCFA · ${hp.trades ?? 0} ${t("transaction(s)")}` : t("aucun échange sur les actions")}
                {volSrc ? ` · ${volSrc.mnemo} : ${volLabel(volAt(hp.date))}` : ""}
              </span>
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
                {" · "}
                {money(between.reduce((a, p) => a + (p.amount ?? 0), 0))} FCFA
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
              <p className={styles.pinsRead}>
                {withVol
                  ? t("Sur la période : {a} FCFA échangés, {n} transactions, {m} séances avec mouvement. Barres dorées : l'indice a bougé.", { a: money(totals.amount), n: fmt(totals.trades), m: String(totals.moved) })
                  : t("Survolez pour lire une séance ; touchez deux points (ou choisissez deux dates) pour lire l'écart entre eux. Les points colorés sont les séances où l'indice a bougé.")}
              </p>
            )}
          </div>
        </>
      )}

      {view === "calendrier" && (
        <Calendar
          points={pts}
          company={co}
          from={period === "all" ? d0 : from}
          to={dN}
          onPick={(d) => {
            if (!at(d)) return;
            setView("niveau");
            togglePin(d);
          }}
        />
      )}

      {view === "societes" && <SmallMultiples index={pts} overlays={overlays} from={from} />}

      {view === "contributions" && <Contributions index={pts} overlays={overlays} from={pinA && pinB ? pinA.date : d0} to={pinA && pinB ? pinB.date : dN} />}

      {view === "capitalisation" && <Capitalisation index={pts} overlays={overlays} W={W} company={co} pins={pins} onPin={togglePin} />}

      {view === "flottant" && <FloatView index={pts} overlays={overlays} W={W} company={co} pins={pins} onPin={togglePin} />}
    </div>
  );
}

/**
 * The tracking of a chart : the nearest session under the pointer, a tip
 * fixed to the viewport, and the two pins that set a range. Shared by the
 * views so a range pinned on one is read on the others.
 */
function useTracker({ dates, x, yAt, W, H, pins, onPin }: { dates: string[]; x: (d: string) => number; yAt: (i: number) => number; W: number; H: number; pins: string[]; onPin: (d: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const touchRef = useRef(false);
  const [hover, setHover] = useState<number | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const nearest = (clientX: number, svg: SVGSVGElement) => {
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    let best = 0;
    let bd = Infinity;
    dates.forEach((d, i) => {
      const dd = Math.abs(x(d) - px);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    return best;
  };
  const show = (i: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = r.left + (x(dates[i]) / W) * r.width;
    const py = r.top + (yAt(i) / H) * r.height;
    const half = 120;
    const cx = Math.min(window.innerWidth - half - 8, Math.max(half + 8, px));
    const above = py + 170 > window.innerHeight;
    setHover(i);
    setPos({ x: cx, y: above ? py - 12 : py + 14, above });
  };
  const handlers = {
    ref: svgRef,
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
      touchRef.current = e.pointerType === "touch";
    },
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType !== "touch") show(nearest(e.clientX, e.currentTarget));
    },
    onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType !== "touch") setHover(null);
    },
    onClick: (e: React.MouseEvent<SVGSVGElement>) => {
      const i = nearest(e.clientX, e.currentTarget);
      if (touchRef.current && hover !== i) {
        show(i);
        return;
      }
      onPin(dates[i]);
    },
  };
  const pinA = pins[0] && dates.includes(pins[0]) ? pins[0] : undefined;
  const pinB = pins[1] && dates.includes(pins[1]) ? pins[1] : undefined;
  return { handlers, hover, pos, pinA, pinB };
}

/** The crosshair, the pins and the pinned range drawn over a chart. */
function TrackMarks({ x, y, hover, pinA, pinB, padT, padB, H }: { x: (d: string) => number; y: (d: string) => number; hover?: string; pinA?: string; pinB?: string; padT: number; padB: number; H: number }) {
  return (
    <>
      {pinA && pinB && <rect x={x(pinA)} y={padT} width={Math.max(0, x(pinB) - x(pinA))} height={H - padT - padB} className={styles.range} />}
      {[pinA, pinB].filter(Boolean).map((d) => (
        <g key={d} className={styles.pin}>
          <line x1={x(d!)} x2={x(d!)} y1={padT} y2={H - padB} />
          <circle cx={x(d!)} cy={y(d!)} r={5} />
        </g>
      ))}
      {hover && (
        <g className={styles.cross}>
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} />
          <circle cx={x(hover)} cy={y(hover)} r={4} />
        </g>
      )}
    </>
  );
}

/** Close of a share at or before a date (sessions are sparse) ; at the start of a history, the first close after it. */
const closeAt = (o: OverlaySeries, date: string) => o.points.filter((p) => p.date <= date).pop()?.value ?? o.points.find((p) => p.date > date)?.value;
/** Signed points of index, « +3,68 pt ». */
const pts = (v: number) => `${v > 0 ? "+" : ""}${lvl(v, 2)} pt`;
/** Capitalisation of a share at a date, on the last share count read. */
const capAt = (o: OverlaySeries, date: string, kind: "total" | "float") => {
  const c = closeAt(o, date);
  const n = kind === "total" ? o.sharesTotal : o.sharesFloat;
  return c && n ? c * n : 0;
};

/** The period's move split by share : weight at the start × the share's own move, on the chosen weighting. */
function Contributions({ index, overlays, from, to }: { index: ChartPoint[]; overlays: OverlaySeries[]; from: string; to: string }) {
  const t = useT();
  const [kind, setKind] = useState<"total" | "float">("total");
  const a = index.find((p) => p.date >= from);
  const b = [...index].reverse().find((p) => p.date <= to);
  if (!a || !b || a.date >= b.date) return <div className="empty">{t("Choisissez deux dates sur la vue Niveau, ou une période.")}</div>;
  const caps = overlays.map((o) => ({ o, cap: capAt(o, a.date, kind) }));
  const total = caps.reduce((s, x) => s + x.cap, 0);
  const rows = caps
    .map(({ o, cap }) => {
      const c0 = closeAt(o, a.date);
      const c1 = closeAt(o, b.date);
      const move = c0 && c1 ? (c1 / c0 - 1) * 100 : 0;
      const weight = total ? (cap / total) * 100 : 0;
      return { o, weight, move, pts: (weight / 100) * move };
    })
    .sort((x, y) => Math.abs(y.pts) - Math.abs(x.pts));
  const sum = rows.reduce((s, r) => s + r.pts, 0);
  const published = (b.value / a.value - 1) * 100;
  const max = Math.max(0.1, ...rows.map((r) => Math.abs(r.pts)));
  const top = rows[0];
  return (
    <div className={styles.contribWrap}>
      <div className={styles.bar}>
        <span>
          {t("du {a} au {b}", { a: fmtDate(a.date), b: fmtDate(b.date) })} · {t("indice")} <b className={published >= 0 ? styles.upT : styles.downT}>{signed(published)}</b>
        </span>
        <label className={styles.select}>
          {t("pondération")}
          <select value={kind} onChange={(e) => setKind(e.target.value as "total" | "float")}>
            <option value="total">{t("capital global")}</option>
            <option value="float">{t("flottant coté")}</option>
          </select>
        </label>
      </div>
      <div className={styles.contrib}>
        {rows.map((r) => (
          <div key={r.o.mnemo} className={styles.contribRow}>
            <Link href={`/societes/${r.o.mnemo.toLowerCase()}?depuis=indice`}>{r.o.mnemo}</Link>
            <span className={styles.contribTrack}>
              <i className={styles.contribZero} />
              <i className={`${styles.contribBar} ${r.pts >= 0 ? styles.contribUp : styles.contribDown}`} style={r.pts >= 0 ? { left: "50%", width: `${(r.pts / max) * 50}%` } : { right: "50%", width: `${(-r.pts / max) * 50}%` }} />
            </span>
            <b className={r.pts > 0 ? styles.upT : r.pts < 0 ? styles.downT : ""}>{pts(r.pts)}</b>
            <small>
              {t("poids")} {lvl(r.weight, 1)} % × {t("cours")} {signed(r.move, 1)}
            </small>
          </div>
        ))}
      </div>
      <p className={styles.legend}>
        <span>
          {t("Somme")} : <b>{pts(sum)}</b>
          {top && sum ? ` · ${top.o.mnemo} ${t("a fait")} ${lvl(Math.min(999, Math.abs((top.pts / sum) * 100)), 0)} % ${t("du mouvement")}` : ""}
        </span>
        <span>
          {t("écart avec la variation publiée")} : {pts(published - sum)} · {t("poids en début de période, cours de clôture ; la note de méthode dit le reste")}
        </span>
      </p>
    </div>
  );
}

/** The sum of the capitalisations, session after session, total and float stacked. */
function Capitalisation({ index, overlays, W, company, pins, onPin }: { index: ChartPoint[]; overlays: OverlaySeries[]; W: number; company?: OverlaySeries; pins: string[]; onPin: (d: string) => void }) {
  const t = useT();
  const [floatOnly, setFloatOnly] = useState(false);
  const H = W < 480 ? 220 : 280;
  const padL = 52;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const set = company ? [company] : overlays;
  const rows = index.map((p) => ({ date: p.date, total: set.reduce((s, o) => s + capAt(o, p.date, "total"), 0), float: set.reduce((s, o) => s + capAt(o, p.date, "float"), 0) }));
  // the stack : companies from the heaviest, each band on top of the previous
  const kind: "total" | "float" = floatOnly ? "float" : "total";
  const order = company ? [] : [...overlays].sort((a, b) => capAt(b, index[index.length - 1].date, kind) - capAt(a, index[index.length - 1].date, kind));
  const stack = order.map((o, i) => ({ o, lower: index.map((p) => order.slice(0, i).reduce((s, q) => s + capAt(q, p.date, kind), 0)), upper: index.map((p) => order.slice(0, i + 1).reduce((s, q) => s + capAt(q, p.date, kind), 0)) }));
  const ready = rows.length >= 2 && rows[rows.length - 1].total > 0;
  const d0 = rows[0]?.date ?? "2000-01-01";
  const dN = rows[rows.length - 1]?.date ?? "2000-01-02";
  const span = Math.max(1, daysBetween(d0, dN));
  const x = (d: string) => padL + (daysBetween(d0, d) / span) * (W - padL - padR);
  const top = Math.max(...rows.map((r) => (floatOnly ? r.float : r.total))) * 1.06;
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const path = (k: "total" | "float") => rows.map((r) => `${x(r.date).toFixed(1)},${y(r[k]).toFixed(1)}`).join(" ");
  const area = (k: "total" | "float") => `${x(d0).toFixed(1)},${y(0).toFixed(1)} ${path(k)} ${x(dN).toFixed(1)},${y(0).toFixed(1)}`;
  const last = rows[rows.length - 1];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f);
  const dates = rows.map((r) => r.date);
  const rowAt = (d: string) => rows.find((r) => r.date === d)!;
  const yOf = (d: string) => y(floatOnly ? rowAt(d).float : rowAt(d).total);
  const track = useTracker({ dates, x, yAt: (i) => y(floatOnly ? rows[i].float : rows[i].total), W, H, pins, onPin });
  const hp = track.hover != null ? rows[track.hover] : undefined;
  const rA = track.pinA ? rowAt(track.pinA) : undefined;
  const rB = track.pinB ? rowAt(track.pinB) : undefined;
  if (!ready) return <div className="empty">{t("Le nombre de titres des sociétés n'est pas encore lu : pas de capitalisation à montrer.")}</div>;
  const band = (lower: number[], upper: number[]) => `${index.map((p, i) => `${x(p.date).toFixed(1)},${y(upper[i]).toFixed(1)}`).join(" ")} ${[...index].reverse().map((p, k) => `${x(p.date).toFixed(1)},${y(lower[index.length - 1 - k]).toFixed(1)}`).join(" ")}`;
  const shade = (i: number) => 0.9 - (i / Math.max(1, order.length - 1)) * 0.7;
  const totalLast = order.reduce((s, o) => s + capAt(o, last.date, kind), 0);
  return (
    <div className={styles.capWrap}>
      <div className={styles.bar}>
        <label className={styles.check}>
          <input type="radio" name="capk" checked={!floatOnly} onChange={() => setFloatOnly(false)} /> {t("capital global et flottant")}
        </label>
        <label className={styles.check}>
          <input type="radio" name="capk" checked={floatOnly} onChange={() => setFloatOnly(true)} /> {t("flottant seul")}
        </label>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={t("Capitalisation de la cote, séance après séance")} {...track.handlers}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
              {money(v)}
            </text>
          </g>
        ))}
        {stack.length > 0 ? (
          stack.map(({ o, lower, upper }, i) => (
            <polygon key={o.mnemo} points={band(lower, upper)} className={styles.stackBand} style={{ fillOpacity: shade(i) }}>
              <title>
                {o.mnemo} · {money(upper[upper.length - 1] - lower[lower.length - 1])} FCFA
              </title>
            </polygon>
          ))
        ) : (
          <>
            {!floatOnly && (
              <>
                <polygon points={area("total")} className={styles.areaTotal} />
                <polyline points={path("total")} className={styles.line} />
              </>
            )}
            <polygon points={area("float")} className={styles.areaFloat} />
            <polyline points={path("float")} className={styles.overlay} />
          </>
        )}
        {stack.map(({ o, lower, upper }, i) => {
          const h = upper[upper.length - 1] - lower[lower.length - 1];
          const mid = y(lower[lower.length - 1] + h / 2);
          return h / top > 0.045 ? (
            <text key={`l${o.mnemo}`} x={W - padR - 4} y={mid + 3} textAnchor="end" className={`${styles.tick} ${styles.stackLabel}`} style={{ fill: i < 2 ? "var(--surface)" : "var(--ink)" }}>
              {o.mnemo} {lvl((h / totalLast) * 100, 0)} %
            </text>
          ) : null;
        })}
        <text x={padL} y={H - 8} className={styles.tick}>
          {fmtDate(d0)}
        </text>
        <text x={W - padR} y={H - 8} textAnchor="end" className={styles.tick}>
          {fmtDate(dN)}
        </text>
        <TrackMarks x={x} y={yOf} hover={hp?.date} pinA={track.pinA} pinB={track.pinB} padT={padT} padB={padB} H={H} />
      </svg>
      {hp && track.pos && (
        <div className={`${styles.tip} ${track.pos.above ? styles.tipAbove : ""}`} style={{ left: track.pos.x, top: track.pos.y }}>
          <b>{fmtDate(hp.date)}</b>
          <span>
            {t("capital global")} : {money(hp.total)} FCFA
          </span>
          <span>
            {t("flottant coté")} : {money(hp.float)} FCFA ({hp.total ? lvl((hp.float / hp.total) * 100, 0) : "—"} %)
          </span>
          {stack.length > 0 && (
            <span className={styles.tipSince}>{order.slice(0, 3).map((o) => `${o.mnemo} ${money(capAt(o, hp.date, kind))}`).join(" · ")}</span>
          )}
        </div>
      )}
      {rA && rB && (
        <p className={styles.pinsRead}>
          <b>
            {fmtDate(rA.date)} → {fmtDate(rB.date)}
          </b>{" "}
          : {t("capital global")} {money(rA.total)} → {money(rB.total)} FCFA (<b className={rB.total >= rA.total ? styles.upT : styles.downT}>{signed(rA.total ? ((rB.total - rA.total) / rA.total) * 100 : 0, 1)}</b>) · {t("flottant coté")} {money(rA.float)} → {money(rB.float)} (<b className={rB.float >= rA.float ? styles.upT : styles.downT}>{signed(rA.float ? ((rB.float - rA.float) / rA.float) * 100 : 0, 1)}</b>)
        </p>
      )}
      <p className={styles.legend}>
        {stack.length > 0 ? (
          <>
            <span>
              {t(floatOnly ? "flottant coté empilé par société" : "capital global empilé par société")} : {money(totalLast)} FCFA · {order.slice(0, 3).map((o) => `${o.mnemo} ${lvl((capAt(o, last.date, kind) / totalLast) * 100, 0)} %`).join(", ")}
            </span>
            <span>{t("la bande la plus sombre est la plus lourde ; choisir une société la montre seule")}</span>
          </>
        ) : (
          <>
            {!floatOnly && (
              <span>
                <i className={styles.kLine} /> {company ? `${company.mnemo} · ` : ""}
                {t("capital global")} : {money(last.total)} FCFA
              </span>
            )}
            <span>
              <i className={`${styles.kLine} ${styles.kGold}`} /> {t("flottant coté")} : {money(last.float)} FCFA ({last.total ? lvl((last.float / last.total) * 100, 0) : "—"} %)
            </span>
            <span>{t("cours de clôture × nombre de titres lu au bulletin ; la même courbe que l'indice, en francs")}</span>
          </>
        )}
      </p>
    </div>
  );
}

/** The published index against a float-weighted reading of the same prices, base 100, and the float rotation per share. */
function FloatView({ index, overlays, W, company, pins, onPin }: { index: ChartPoint[]; overlays: OverlaySeries[]; W: number; company?: OverlaySeries; pins: string[]; onPin: (d: string) => void }) {
  const t = useT();
  const H = W < 480 ? 220 : 260;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  // chain the float-weighted session returns : Σ (float cap of the previous session) × (close / previous close − 1)
  const reading: { date: string; y: number }[] = [];
  let level = 100;
  index.forEach((p, i) => {
    if (i > 0) {
      const prev = index[i - 1].date;
      const caps = overlays.map((o) => ({ o, cap: capAt(o, prev, "float") }));
      const tot = caps.reduce((s, c) => s + c.cap, 0);
      let r = 0;
      for (const { o, cap } of caps) {
        const c0 = closeAt(o, prev);
        const c1 = closeAt(o, p.date);
        if (c0 && c1 && tot) r += (cap / tot) * (c1 / c0 - 1);
      }
      level *= 1 + r;
    }
    reading.push({ date: p.date, y: level });
  });
  const pub = index.map((p) => ({ date: p.date, y: (p.value / index[0].value) * 100 }));
  const d0 = index[0].date;
  const dN = index[index.length - 1].date;
  const span = Math.max(1, daysBetween(d0, dN));
  const x = (d: string) => padL + (daysBetween(d0, d) / span) * (W - padL - padR);
  const all = [...pub.map((p) => p.y), ...reading.map((p) => p.y)];
  const lo = Math.min(...all) - 1;
  const hi = Math.max(...all) + 1;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const path = (arr: { date: string; y: number }[]) => arr.map((p) => `${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const pubEnd = pub[pub.length - 1].y - 100;
  const readEnd = reading[reading.length - 1].y - 100;
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  const dates = index.map((p) => p.date);
  const track = useTracker({ dates, x, yAt: (i) => y(pub[i].y), W, H, pins, onPin });
  const hp = track.hover != null ? index[track.hover] : undefined;
  const at = (arr: { date: string; y: number }[], d: string) => arr.find((p) => p.date === d)?.y ?? 100;
  // the rotation window : the pinned range when there is one, else the period
  const rFrom = track.pinA && track.pinB ? track.pinA : d0;
  const rTo = track.pinA && track.pinB ? track.pinB : dN;
  // rotation : amount traded over the window ÷ float capitalisation at its end
  const rot = overlays
    .map((o) => {
      const amount = o.points.filter((p) => p.date > rFrom && p.date <= rTo).reduce((s, p) => s + (p.amount ?? 0), 0);
      const cap = capAt(o, rTo, "float");
      return { o, amount, cap, pct: cap ? (amount / cap) * 100 : 0 };
    })
    .sort((a, b) => b.pct - a.pct);
  const rotMax = Math.max(1, ...rot.map((r) => r.pct));
  const totAmount = rot.reduce((s, r) => s + r.amount, 0);
  const totCap = rot.reduce((s, r) => s + r.cap, 0);
  const hasCaps = totCap > 0;
  return (
    <div className={styles.capWrap}>
      {hasCaps ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={t("Indice publié et lecture en flottant, base 100")} {...track.handlers}>
            {tickVals.map((v) => (
              <g key={v}>
                <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={styles.grid} />
                <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
                  {lvl(v, 0)}
                </text>
              </g>
            ))}
            <line x1={padL} x2={W - padR} y1={y(100)} y2={y(100)} className={styles.baseLine} />
            <polyline points={path(reading)} className={styles.overlay} />
            <polyline points={path(pub)} className={styles.line} />
            <text x={padL} y={H - 8} className={styles.tick}>
              {fmtDate(d0)}
            </text>
            <text x={W - padR} y={H - 8} textAnchor="end" className={styles.tick}>
              {fmtDate(dN)}
            </text>
            <TrackMarks x={x} y={(d) => y(at(pub, d))} hover={hp?.date} pinA={track.pinA} pinB={track.pinB} padT={padT} padB={padB} H={H} />
          </svg>
          {hp && track.pos && (
            <div className={`${styles.tip} ${track.pos.above ? styles.tipAbove : ""}`} style={{ left: track.pos.x, top: track.pos.y }}>
              <b>{fmtDate(hp.date)}</b>
              <span>
                {t("indice publié")} : {lvl(at(pub, hp.date), 1)} <em className={at(pub, hp.date) >= 100 ? styles.upT : styles.downT}>{signed(at(pub, hp.date) - 100, 1)}</em>
              </span>
              <span>
                {t("lecture en flottant")} : {lvl(at(reading, hp.date), 1)} <em className={at(reading, hp.date) >= 100 ? styles.upT : styles.downT}>{signed(at(reading, hp.date) - 100, 1)}</em>
              </span>
              <span className={styles.tipSince}>
                {t("écart")} : {signed(at(pub, hp.date) - at(reading, hp.date), 1).replace(" %", " pt")}
              </span>
            </div>
          )}
          {track.pinA && track.pinB && (
            <p className={styles.pinsRead}>
              <b>
                {fmtDate(track.pinA)} → {fmtDate(track.pinB)}
              </b>{" "}
              : {t("indice publié")} <b className={at(pub, track.pinB) >= at(pub, track.pinA) ? styles.upT : styles.downT}>{signed((at(pub, track.pinB) / at(pub, track.pinA) - 1) * 100, 1)}</b> · {t("lecture en flottant")} <b className={at(reading, track.pinB) >= at(reading, track.pinA) ? styles.upT : styles.downT}>{signed((at(reading, track.pinB) / at(reading, track.pinA) - 1) * 100, 1)}</b> · {t("la rotation ci-dessous est celle de cet intervalle")}
            </p>
          )}
          <p className={styles.legend}>
            <span>
              <i className={styles.kLine} /> {t("indice publié, capital global")} : {signed(pubEnd, 1)}
            </span>
            <span>
              <i className={`${styles.kLine} ${styles.kGold}`} /> {t("lecture en flottant coté (Guichet, non publiée)")} : {signed(readEnd, 1)}
            </span>
            <span>{t("les mêmes cours, pesés par les seuls titres en mains du public : l'écart dit combien le mouvement tenait à des titres qui ne s'échangent pas")}</span>
          </p>
        </>
      ) : (
        <div className="empty">{t("Le nombre de titres des sociétés n'est pas encore lu : pas de lecture en flottant à montrer.")}</div>
      )}
      <div className={styles.contrib}>
        <div className={styles.contribHead}>
          {t("Rotation du flottant · montant échangé ÷ flottant coté")} · {fmtDate(rFrom)} → {fmtDate(rTo)}
        </div>
        {company && totCap > 0 && (
          <p className={styles.legend}>
            <span>
              <b>{company.mnemo}</b> : {lvl((capAt(company, dN, "float") / totCap) * 100, 1)} % {t("du flottant de la cote")} ({money(capAt(company, dN, "float"))} FCFA) · {lvl((capAt(company, dN, "total") / overlays.reduce((s, o) => s + capAt(o, dN, "total"), 0)) * 100, 1)} % {t("du capital global")} · {t("flottant")} {capAt(company, dN, "total") ? lvl((capAt(company, dN, "float") / capAt(company, dN, "total")) * 100, 0) : "—"} % {t("de son capital")}
            </span>
          </p>
        )}
        {rot.map((r) => (
          <div key={r.o.mnemo} className={`${styles.contribRow} ${company && company.mnemo !== r.o.mnemo ? styles.contribDim : ""} ${company && company.mnemo === r.o.mnemo ? styles.contribOn : ""}`}>
            <Link href={`/societes/${r.o.mnemo.toLowerCase()}?depuis=indice`}>{r.o.mnemo}</Link>
            <span className={styles.contribTrack}>
              <i className={`${styles.contribBar} ${styles.contribGold}`} style={{ left: 0, width: `${(r.pct / rotMax) * 100}%` }} />
            </span>
            <b>{lvl(r.pct, r.pct < 10 ? 1 : 0)} %</b>
            <small>
              {money(r.amount)} FCFA {t("sur")} {money(r.cap)}
            </small>
          </div>
        ))}
      </div>
      <p className={styles.legend}>
        <span>
          {t("Cote entière")} : {totCap ? lvl((totAmount / totCap) * 100, 0) : "—"} % {t("du flottant a changé de mains sur la période")} ({money(totAmount)} {t("sur")} {money(totCap)} FCFA)
        </span>
        <span>{t("une rotation faible veut dire qu'une position peut prendre des mois à sortir")}</span>
      </p>
    </div>
  );
}

/** A year (or the period) of sessions : one cell per weekday, a column per week ; colour is the move, dashed is a bulletin not read. */
function Calendar({ points, company, from, to, onPick }: { points: ChartPoint[]; company?: OverlaySeries; from: string; to: string; onPick: (d: string) => void }) {
  const t = useT();
  const byDate = new Map(points.map((p) => [p.date, p]));
  const coByDate = new Map((company?.points ?? []).map((p) => [p.date, p]));
  // the bubble is fixed to the viewport (the panel clips its overflow) and kept inside it
  const [tip, setTip] = useState<{ date: string; x: number; y: number; above: boolean } | null>(null);
  const touch = useRef(false);
  const showTip = (date: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const half = 130;
    const x = Math.min(window.innerWidth - half - 8, Math.max(half + 8, r.left + r.width / 2));
    const above = r.bottom + 200 > window.innerHeight;
    setTip({ date, x, y: above ? r.top - 6 : r.bottom + 6, above });
  };
  const tipPoint = tip ? byDate.get(tip.date) : undefined;
  const prevOf = (d: string) => {
    const i = points.findIndex((p) => p.date === d);
    return i > 0 ? points[i - 1] : undefined;
  };
  const start = new Date(`${from}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(`${to}T12:00:00Z`);
  const weeks: string[][] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 7)) {
    const w: string[] = [];
    for (let k = 0; k < 5; k++) w.push(new Date(d.getTime() + k * 86400e3).toISOString().slice(0, 10));
    weeks.push(w);
  }
  const cls = (d: string) => {
    if (d < from || d > to) return styles.calOut;
    const p = byDate.get(d);
    if (!p) return styles.calMissing;
    if (company) {
      const q = coByDate.get(d);
      if (!q) return styles.calFlat;
      const cv = q.variationPct ?? 0;
      if (cv === 0) return (q.trades ?? 0) > 0 ? styles.calTraded : styles.calFlat;
      const ca = Math.abs(cv);
      return `${cv > 0 ? styles.calUp : styles.calDown} ${styles[`calL${ca >= 3 ? 3 : ca >= 1 ? 2 : 1}`]}`;
    }
    const v = p.variationPct ?? 0;
    if (v === 0) return styles.calFlat;
    const a = Math.abs(v);
    const lvlCls = a >= 1 ? 3 : a >= 0.3 ? 2 : 1;
    return `${v > 0 ? styles.calUp : styles.calDown} ${styles[`calL${lvlCls}`]}`;
  };
  const missing = weeks.flat().filter((d) => d >= from && d <= to && !byDate.has(d)).length;
  const monthAt = (i: number) => {
    const m = weeks[i][0].slice(0, 7);
    return i === 0 || weeks[i - 1][0].slice(0, 7) !== m ? new Date(`${weeks[i][0]}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "short" }) : "";
  };
  const day = ["lun", "mar", "mer", "jeu", "ven"];
  return (
    <div className={styles.calWrap} onPointerLeave={(e) => e.pointerType !== "touch" && setTip(null)}>
      <div className={styles.cal} style={{ gridTemplateColumns: `28px repeat(${weeks.length}, 1fr)` }}>
        <span />
        {weeks.map((w, i) => (
          <span key={w[0]} className={styles.calMonth}>
            {monthAt(i)}
          </span>
        ))}
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} style={{ display: "contents" }}>
            <span className={styles.calDay}>{day[k]}</span>
            {weeks.map((w) => {
              const d = w[k];
              const p = byDate.get(d);
              const label = p ? `${fmtDate(d)} · ${lvl(p.value)} · ${signed(p.variationPct)}` : d >= from && d <= to ? `${fmtDate(d)} · ${t("bulletin non lu")}` : "";
              const inRange = d >= from && d <= to;
              return p ? (
                <button
                  key={d}
                  type="button"
                  className={`${styles.calCell} ${cls(d)}`}
                  aria-label={label}
                  onPointerDown={(e) => {
                    touch.current = e.pointerType === "touch";
                  }}
                  onClick={(e) => {
                    if (touch.current && tip?.date !== d) {
                      showTip(d, e.currentTarget);
                      return;
                    }
                    onPick(d);
                  }}
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "touch") showTip(d, e.currentTarget);
                  }}
                  onFocus={(e) => showTip(d, e.currentTarget)}
                />
              ) : (
                <i key={d} className={`${styles.calCell} ${cls(d)}`} aria-label={label || undefined} onPointerEnter={inRange ? (e) => showTip(d, e.currentTarget) : undefined} onClick={inRange ? (e) => showTip(d, e.currentTarget) : undefined} />
              );
            })}
          </div>
        ))}
      </div>
      {tip && (
        <div className={`${styles.calTip} ${tip.above ? styles.calTipAbove : ""}`} style={{ left: tip.x, top: tip.y }} role="status">
          <b>{new Date(`${tip.date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b>
          {tipPoint && company ? (
            (() => {
              const q = coByDate.get(tip.date);
              return q ? (
                <>
                  <div className={styles.calTipRow}>
                    <span className={styles.calTipLevel}>
                      {company.mnemo} {fmt(q.value)}
                    </span>
                    <em className={`${styles.calTipDelta} ${(q.variationPct ?? 0) > 0 ? styles.calTipUp : (q.variationPct ?? 0) < 0 ? styles.calTipDown : ""}`}>{signed(q.variationPct)}</em>
                  </div>
                  <small>{q.trades ? `${fmt(q.titles ?? 0)} ${t("titres")} · ${money(q.amount ?? 0)} FCFA · ${q.trades} ${t("transaction(s)")}` : t("pas d'échange sur cette valeur")}</small>
                  <small>
                    {t("l'indice")} : {lvl(tipPoint.value)} · {signed(tipPoint.variationPct)}
                  </small>
                  <small className={styles.calTipHint}>{t("toucher pour épingler sur la vue Niveau")}</small>
                </>
              ) : (
                <small>{t("cours de cette valeur non lu sur cette séance")}</small>
              );
            })()
          ) : tipPoint ? (
            <>
              <div className={styles.calTipRow}>
                <span className={styles.calTipLevel}>{lvl(tipPoint.value)}</span>
                <em className={`${styles.calTipDelta} ${(tipPoint.variationPct ?? 0) > 0 ? styles.calTipUp : (tipPoint.variationPct ?? 0) < 0 ? styles.calTipDown : ""}`}>{signed(tipPoint.variationPct)}</em>
              </div>
              {prevOf(tip.date) && (
                <small>
                  {t("séance précédente")} {fmtDate(prevOf(tip.date)!.date)} : {lvl(prevOf(tip.date)!.value)}
                </small>
              )}
              {tipPoint.movers?.length ? (
                <div className={styles.calTipMovers}>
                  {tipPoint.movers.map((m) => (
                    <span key={m.mnemo}>
                      {m.mnemo} <em className={m.variationPct > 0 ? styles.calTipUp : m.variationPct < 0 ? styles.calTipDown : ""}>{m.variationPct !== 0 ? signed(m.variationPct) : t("échange")}</em>
                    </span>
                  ))}
                </div>
              ) : (tipPoint.variationPct ?? 0) !== 0 ? (
                <small>{t("cours d'action non lus sur cette séance")}</small>
              ) : null}
              <small>{tipPoint.titles ? `${fmt(tipPoint.titles)} ${t("titres")} · ${money(tipPoint.amount ?? 0)} FCFA · ${tipPoint.trades ?? 0} ${t("transaction(s)")}` : t("aucun échange sur les actions")}</small>
              <small className={styles.calTipHint}>{t("toucher pour épingler sur la vue Niveau")}</small>
            </>
          ) : (
            <small>{t("Jour ouvré sans bulletin lu : jour férié, séance non tenue ou bulletin non publié.")}</small>
          )}
        </div>
      )}
      <p className={styles.legend}>
        <span>
          <i className={`${styles.sw} ${styles.calFlat}`} /> {t("séance à 0,00 %")}
        </span>
        <span>
          <i className={`${styles.sw} ${styles.calUp} ${styles.calL3}`} /> {t("hausse")}
        </span>
        <span>
          <i className={`${styles.sw} ${styles.calDown} ${styles.calL3}`} /> {t("baisse")}
        </span>
        {company && (
          <span>
            <i className={`${styles.sw} ${styles.calTraded}`} /> {t("échange sans changement de cours")}
          </span>
        )}
        <span>
          <i className={`${styles.sw} ${styles.calMissing}`} /> {t("jour ouvré sans bulletin lu (jours fériés compris)")}
        </span>
        {company && (
          <span>
            <b>{company.mnemo}</b> : {[...coByDate.entries()].filter(([d, q]) => d >= from && d <= to && (q.variationPct ?? 0) !== 0).length} {t("séances avec changement de cours")}, {[...coByDate.entries()].filter(([d, q]) => d >= from && d <= to && (q.trades ?? 0) > 0).length} {t("avec échange")}
          </span>
        )}
        <span>
          {points.length} {t("séances lues")}, {points.filter((p) => (p.variationPct ?? 0) !== 0).length} {t("avec mouvement")}, {missing} {t("sans bulletin")} · {t("toucher une séance l'épingle sur la vue Niveau")}
        </span>
      </p>
    </div>
  );
}

/** Each listed share against the index, both in base 100 over the period, one small chart per share. */
function SmallMultiples({ index, overlays, from }: { index: ChartPoint[]; overlays: OverlaySeries[]; from: string }) {
  const t = useT();
  const i0 = index[0]?.value;
  if (!i0) return null;
  const ix = index.map((p) => ({ date: p.date, y: (p.value / i0) * 100 }));
  const iEnd = ix[ix.length - 1].y - 100;
  return (
    <div className={styles.smWrap}>
      <div className={styles.sm}>
        {overlays.map((o) => {
          const pts = o.points.filter((p) => p.date >= from);
          const s0 = pts[0]?.value;
          if (!s0 || pts.length < 2) return null;
          const s = pts.map((p) => ({ date: p.date, y: (p.value / s0) * 100 }));
          const sEnd = s[s.length - 1].y - 100;
          const all = [...s.map((p) => p.y), ...ix.map((p) => p.y)];
          const lo = Math.min(...all) - 1;
          const hi = Math.max(...all) + 1;
          const d0 = ix[0].date < s[0].date ? ix[0].date : s[0].date;
          const dN = ix[ix.length - 1].date > s[s.length - 1].date ? ix[ix.length - 1].date : s[s.length - 1].date;
          const span = Math.max(1, daysBetween(d0, dN));
          const x = (d: string) => 4 + (daysBetween(d0, d) / span) * 192;
          const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * 50;
          const path = (arr: { date: string; y: number }[]) => arr.map((p) => `${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
          const alone = Math.abs(sEnd - iEnd) >= 2;
          return (
            <Link key={o.mnemo} href={`/societes/${o.mnemo.toLowerCase()}?depuis=indice`} className={styles.smCard}>
              <b>
                {o.mnemo} <span className={sEnd > 0 ? styles.upT : sEnd < 0 ? styles.downT : ""}>{signed(sEnd, 1)}</span>
              </b>
              <small>
                {o.name} · {t("l'indice")} {signed(iEnd, 1)}
              </small>
              <svg viewBox="0 0 200 62" className={styles.smSvg} aria-label={`${o.mnemo} ${t("et l'indice, base 100")}`}>
                <line x1="4" x2="196" y1={y(100)} y2={y(100)} className={styles.grid} />
                <polyline points={path(ix)} className={styles.overlay} />
                <polyline points={path(s)} className={styles.line} />
              </svg>
              <small>{alone ? (sEnd > iEnd ? t("a fait plus que le marché") : t("a fait moins que le marché")) : t("a suivi le marché")}</small>
            </Link>
          );
        })}
      </div>
      <p className={styles.legend}>
        <span>
          <i className={styles.kLine} /> {t("la société")}
        </span>
        <span>
          <i className={`${styles.kLine} ${styles.kGold}`} /> {t("l'indice")}
        </span>
        <span>{t("base 100 au début de la période · toucher une vignette ouvre la société")}</span>
      </p>
    </div>
  );
}
