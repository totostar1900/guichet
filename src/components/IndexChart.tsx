"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  points: { date: string; value: number; titles?: number; amount?: number; trades?: number }[];
  /** Shares in issue and in public hands (the last count read), so a capitalisation exists for every session. */
  sharesTotal?: number;
  sharesFloat?: number;
}

export type IndexView = "niveau" | "volumes" | "contributions" | "calendrier" | "societes" | "capitalisation" | "flottant";
type PeriodKey = "1m" | "3m" | "ytd" | "12m" | "all";
type VolumeKey = "amount" | "titles" | "trades";
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
  const tipX = hp ? x(hp.date) : 0;
  const tipLeft = tipX > W * 0.6;
  const lineView = view === "niveau" || view === "volumes";

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
            onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget))}
            onPointerLeave={() => setHover(null)}
            onClick={(e) => togglePin(pts[nearest(e.clientX, e.currentTarget)].date)}
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

      {view === "capitalisation" && <Capitalisation index={pts} overlays={overlays} W={W} />}

      {view === "flottant" && <FloatView index={pts} overlays={overlays} W={W} />}
    </div>
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
function Capitalisation({ index, overlays, W }: { index: ChartPoint[]; overlays: OverlaySeries[]; W: number }) {
  const t = useT();
  const [floatOnly, setFloatOnly] = useState(false);
  const H = W < 480 ? 220 : 280;
  const padL = 52;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const rows = index.map((p) => ({ date: p.date, total: overlays.reduce((s, o) => s + capAt(o, p.date, "total"), 0), float: overlays.reduce((s, o) => s + capAt(o, p.date, "float"), 0) }));
  if (rows.length < 2 || !rows[rows.length - 1].total) return <div className="empty">{t("Le nombre de titres des sociétés n'est pas encore lu : pas de capitalisation à montrer.")}</div>;
  const d0 = rows[0].date;
  const dN = rows[rows.length - 1].date;
  const span = Math.max(1, daysBetween(d0, dN));
  const x = (d: string) => padL + (daysBetween(d0, d) / span) * (W - padL - padR);
  const top = Math.max(...rows.map((r) => (floatOnly ? r.float : r.total))) * 1.06;
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const path = (k: "total" | "float") => rows.map((r) => `${x(r.date).toFixed(1)},${y(r[k]).toFixed(1)}`).join(" ");
  const area = (k: "total" | "float") => `${x(d0).toFixed(1)},${y(0).toFixed(1)} ${path(k)} ${x(dN).toFixed(1)},${y(0).toFixed(1)}`;
  const last = rows[rows.length - 1];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f);
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
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={t("Capitalisation de la cote, séance après séance")}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
              {money(v)}
            </text>
          </g>
        ))}
        {!floatOnly && (
          <>
            <polygon points={area("total")} className={styles.areaTotal} />
            <polyline points={path("total")} className={styles.line} />
          </>
        )}
        <polygon points={area("float")} className={styles.areaFloat} />
        <polyline points={path("float")} className={styles.overlay} />
        <text x={padL} y={H - 8} className={styles.tick}>
          {fmtDate(d0)}
        </text>
        <text x={W - padR} y={H - 8} textAnchor="end" className={styles.tick}>
          {fmtDate(dN)}
        </text>
      </svg>
      <p className={styles.legend}>
        {!floatOnly && (
          <span>
            <i className={styles.kLine} /> {t("capital global")} : {money(last.total)} FCFA
          </span>
        )}
        <span>
          <i className={`${styles.kLine} ${styles.kGold}`} /> {t("flottant coté")} : {money(last.float)} FCFA ({last.total ? lvl((last.float / last.total) * 100, 0) : "—"} %)
        </span>
        <span>{t("cours de clôture × nombre de titres lu au bulletin ; la même courbe que l'indice, en francs")}</span>
      </p>
    </div>
  );
}

/** The published index against a float-weighted reading of the same prices, base 100, and the float rotation per share. */
function FloatView({ index, overlays, W }: { index: ChartPoint[]; overlays: OverlaySeries[]; W: number }) {
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
  // rotation : amount traded over the period ÷ float capitalisation at the end
  const rot = overlays
    .map((o) => {
      const amount = o.points.filter((p) => p.date >= d0 && p.date <= dN).reduce((s, p) => s + (p.amount ?? 0), 0);
      const cap = capAt(o, dN, "float");
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
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={t("Indice publié et lecture en flottant, base 100")}>
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
          </svg>
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
        <div className={styles.contribHead}>{t("Rotation du flottant sur la période · montant échangé ÷ flottant coté")}</div>
        {rot.map((r) => (
          <div key={r.o.mnemo} className={styles.contribRow}>
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
function Calendar({ points, from, to, onPick }: { points: ChartPoint[]; from: string; to: string; onPick: (d: string) => void }) {
  const t = useT();
  const byDate = new Map(points.map((p) => [p.date, p]));
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ date: string; x: number; y: number; left: boolean } | null>(null);
  const showTip = (date: string, el: HTMLElement) => {
    const box = wrapRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!box) return;
    setTip({ date, x: r.left - box.left + r.width / 2, y: r.bottom - box.top + 6, left: r.left - box.left > box.width * 0.6 });
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
    <div className={styles.calWrap} ref={wrapRef} onPointerLeave={() => setTip(null)}>
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
                <button key={d} type="button" className={`${styles.calCell} ${cls(d)}`} aria-label={label} onClick={() => onPick(d)} onPointerEnter={(e) => showTip(d, e.currentTarget)} onFocus={(e) => showTip(d, e.currentTarget)} />
              ) : (
                <i key={d} className={`${styles.calCell} ${cls(d)}`} aria-label={label || undefined} onPointerEnter={inRange ? (e) => showTip(d, e.currentTarget) : undefined} />
              );
            })}
          </div>
        ))}
      </div>
      {tip && (
        <div className={`${styles.calTip} ${tip.left ? styles.calTipLeft : ""}`} style={{ left: tip.x, top: tip.y }} role="status">
          <b>{new Date(`${tip.date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b>
          {tipPoint ? (
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
        <span>
          <i className={`${styles.sw} ${styles.calMissing}`} /> {t("jour ouvré sans bulletin lu (jours fériés compris)")}
        </span>
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
