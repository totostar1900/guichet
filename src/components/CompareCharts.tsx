"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useOutsideTap, usePhone } from "./chart-utils";
import type { CompareLine, FlowItem } from "@/lib/domain/compare";
import { drawdown, invested, REF_AMOUNT, rollingAnnualised, type SeriesPoint } from "./FundCharts";
import { axisLabel } from "./NavChart";
import { daysBetween } from "@/lib/finance";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import q from "./QuoteHistory.module.css";
import styles from "./CompareCharts.module.css";
import { useT } from "@/i18n/client";

/**
 * The graphs under the comparison table. Which ones appear depends on the
 * pair: the return on one bar for every pair; two funds on one frame
 * (amount invested, rolling return, drawdown); two debt securities as a
 * cash-flow calendar; a fund against a debt security — its past against the
 * other's promise. Each graph says how to read it.
 */
export interface Benchmark {
  label: string;
  pct: number;
}
const signed = (v?: number | null, d = 2) => (v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const COLORS = [styles.a, styles.b];

export function CompareCharts({ lines, benchmark }: { lines: CompareLine[]; benchmark?: Benchmark }) {
  const t = useT();
  const funds = lines.filter((l) => l.navs && l.navs.length > 1);
  const debts = lines.filter((l) => l.flows && l.flows.items.length > 0);
  return (
    <section className={styles.wrap} aria-label={t("Graphiques")}>
      <h2 className="display">{t("Graphiques")}</h2>
      <ReturnBars lines={lines} benchmark={benchmark} />
      {funds.length === 2 && <TwoFunds lines={funds} benchmark={benchmark} />}
      {funds.length === 1 && debts.length === 1 && !funds[0].flows && <FundVsDebt fund={funds[0]} debt={debts[0]} />}
      {debts.length === 2 && <Calendar lines={debts} />}
      {debts.length === 1 && funds.length === 0 && <Calendar lines={debts} />}
    </section>
  );
}

/* ---------- 1. the return on one bar, every pair ---------- */
const NATURE: Record<CompareLine["ret"]["nature"], string> = {
  promesse: "une promesse, si l'émetteur paie",
  passe: "un passé, pas une prévision",
  cours: "un dividende au cours du jour, jamais garanti",
  aucune: "pas de rendement à comparer",
};
function ReturnBars({ lines, benchmark }: { lines: CompareLine[]; benchmark?: Benchmark }) {
  const t = useT();
  const rows = [...lines.map((l, i) => ({ label: t(l.title), pct: l.ret.pct, note: l.ret.note, nature: l.ret.nature, cls: COLORS[i] })), ...(benchmark ? [{ label: benchmark.label, pct: benchmark.pct, note: t("le dernier bon du Trésor publié"), nature: "promesse" as const, cls: styles.bench }] : [])];
  const max = Math.max(1, ...rows.map((r) => r.pct ?? 0));
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <b>{t("Le rendement, sur une même règle")}</b>
        <span>{t("brut, avant frais et fiscalité")}</span>
      </div>
      <div className={styles.bars}>
        {rows.map((r) => (
          <div key={r.label} className={styles.barRow}>
            <span className={styles.barLabel}>{r.label}</span>
            <div className={styles.barTrack}>
              {r.pct != null ? <div className={`${styles.bar} ${r.cls}`} style={{ width: `${Math.max(1.5, (r.pct / max) * 100)}%` }} /> : <span className={styles.none}>—</span>}
            </div>
            <span className={styles.barValue}>
              {r.pct != null ? <b>{fmtPct(r.pct, 2)}</b> : <b>—</b>} <small>{t(r.note)}</small>
            </span>
          </div>
        ))}
      </div>
      <p className={styles.how}>
        <b>{t("Comment lire")}</b> — {t("Les barres se comparent, mais pas leurs natures :")}{" "}
        {lines.map((l, i) => (
          <span key={l.id}>
            {i > 0 ? " · " : ""}
            <i className={COLORS[i]}>■</i> {t(l.title)} : {t(NATURE[l.ret.nature])}
          </span>
        ))}
.{" "}
        {lines.some((l) => l.ret.nature === "promesse") && t("Un rendement « si servi » ou « au pair » suppose que votre ordre est servi au prix indiqué et que l'émetteur paie jusqu'au terme.") + " "}
        {lines.some((l) => l.ret.nature === "passe") && t("Un rendement passé ne dit rien de l'année qui vient : il se lit avec le repli et les variations.") + " "}
        {lines.some((l) => l.ret.nature === "cours") && t("Un rendement de dividende dépend d'une décision annuelle des actionnaires et bouge avec le cours.") + " "}
        {lines.some((l) => l.ret.nature === "aucune") && t("Une ligne sans rendement (un rachat, une action sans dividende connu) se lit dans le calendrier des flux, pas ici.")}
      </p>
    </div>
  );
}

/* ---------- 2. two funds on one frame ---------- */
type Reading = "placement" | "rendement" | "repli";
function TwoFunds({ lines, benchmark }: { lines: CompareLine[]; benchmark?: Benchmark }) {
  const t = useT();
  const [reading, setReading] = useState<Reading>("placement");
  const navs = lines.map((l) => (l.navs ?? []).map((n) => ({ date: n.date, nav: n.nav, bulletinNo: n.bulletinNo, perfSinceInceptionPct: 0 })));
  // The common period: from the younger fund's first NAV to the last date both have.
  const from = navs.map((s) => s[0].date).sort().pop()!;
  const to = navs.map((s) => s[s.length - 1].date).sort()[0];
  // The look-back both funds can carry: 12 months when they have it, else 6, 3, or one month.
  const shortest = Math.min(...navs.map((s) => daysBetween(s[0].date, s[s.length - 1].date)));
  const windowDays = [365, 183, 92, 31].find((d) => shortest >= d * 1.2) ?? 31;
  const series = useMemo(
    () =>
      navs.map((all) => {
        const win = all.filter((p) => p.date >= from && p.date <= to);
        if (reading === "placement") return invested(win);
        if (reading === "repli") return drawdown(win);
        return rollingAnnualised(all, windowDays).filter((p) => p.date >= from && p.date <= to);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, reading, from, to, windowDays],
  );
  const bench = benchmark && reading !== "repli" ? { label: benchmark.label, at: (date: string) => (reading === "rendement" ? benchmark.pct : REF_AMOUNT * (1 + (benchmark.pct / 100) * (daysBetween(from, date) / 365))) } : undefined;
  const fmtY = reading === "placement" ? (v: number) => fmt(v) : (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
  const ends = series.map((s) => s[s.length - 1]);
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <b>{t("Deux fonds sur la même période")}</b>
        <span>
          {t("du")} {fmtDate(from)} {t("au")} {fmtDate(to)} · {t("la période commune, à partir de la première VL du plus jeune")}
        </span>
      </div>
      <div className={q.modes} role="group" aria-label={t("Lecture")}>
        {(["placement", "rendement", "repli"] as Reading[]).map((r) => (
          <button key={r} type="button" className={reading === r ? q.on : ""} aria-pressed={reading === r} onClick={() => setReading(r)}>
            {r === "placement" ? t("1 000 000 FCFA placés") : r === "rendement" ? t("Rendement annualisé ({n} mois)", { n: Math.round(windowDays / 30) }) : t("Repli")}
          </button>
        ))}
      </div>
      {series.some((s) => s.length >= 2) ? <DualChart series={series} labels={lines.map((l) => t(l.title))} bench={bench} fmtY={fmtY} zero={reading !== "placement"} area={reading === "repli" ? "down" : "up"} /> : <div className="empty">{t("Pas assez d'historique commun : les deux fonds n'ont pas encore deux VL publiées aux mêmes dates.")}</div>}
      <div className={styles.keys}>
        {lines.map((l, i) => (
          <span key={l.id}>
            <i className={COLORS[i]}>■</i> {t(l.title)}
            {ends[i] ? <b> · {reading === "placement" ? `${fmt(ends[i].y)} FCFA` : signed(ends[i].y)}</b> : null}
          </span>
        ))}
        {bench && (
          <span>
            <i className={styles.bench}>┄</i> {bench.label} {fmtPct(benchmark!.pct, 2)}
          </span>
        )}
      </div>
      <p className={styles.how}>
        <b>{t("Comment lire")}</b> —{" "}
        {reading === "placement" && t("Le même million placé le même jour dans chaque fonds, brut, avant frais d'entrée et de sortie ; la ligne pointillée est ce que le dernier bon du Trésor aurait donné. Une courbe plus haute a gagné plus, pas forcément avec le même calme : regardez « Repli ».")}
        {reading === "rendement" && t("À chaque date, le rendement annualisé des {n} mois qui précèdent, pour chaque fonds — la fenêtre la plus longue que les deux historiques permettent. Une courbe stable est un fonds régulier ; deux courbes qui se croisent souvent se valent sur la durée.", { n: Math.round(windowDays / 30) })}
        {reading === "rendement" && series.some((s) => s.length === 0) && " " + t("Un des deux fonds n'a pas encore assez de VL pour cette fenêtre : sa courbe viendra avec les prochains bulletins.")}
        {reading === "repli" && t("À chaque date, de combien chaque fonds était sous son plus haut : zéro = au sommet. Plus la zone rouge est profonde et longue, plus il a fallu de patience. C'est le prix du gain de l'autre lecture.")}
      </p>
    </div>
  );
}

/* ---------- 3. a fund against a debt security ---------- */
function FundVsDebt({ fund, debt }: { fund: CompareLine; debt: CompareLine }) {
  const t = useT();
  const items = debt.flows!.items;
  const start = items[0].date;
  const end = items[items.length - 1].date;
  const horizon = Math.max(1, daysBetween(start, end));
  // The fund's past over the same length of time, ending at its latest NAV.
  const navs = (fund.navs ?? []).map((n) => ({ date: n.date, nav: n.nav, bulletinNo: n.bulletinNo, perfSinceInceptionPct: 0 }));
  const last = navs[navs.length - 1].date;
  const win = navs.filter((p) => daysBetween(p.date, last) <= horizon);
  const past = invested(win);
  // The debt's promise for the same amount: what has come back so far, plus the capital at the end.
  const scale = debt.flows!.outlay > 0 ? REF_AMOUNT / debt.flows!.outlay : 0;
  // Cash received so far plus what is still in the security (the whole amount until the final redemption).
  const inflows = items.filter((f) => f.amount > 0);
  let cash = 0;
  const steps: SeriesPoint[] = [{ date: start, y: REF_AMOUNT, nav: 0, bulletinNo: 0 }];
  inflows.forEach((f, i) => {
    const lastFlow = i === inflows.length - 1;
    steps.push({ date: f.date, y: cash + REF_AMOUNT, nav: 0, bulletinNo: 0 });
    cash += f.amount * scale;
    steps.push({ date: f.date, y: cash + (lastFlow ? 0 : REF_AMOUNT), nav: 0, bulletinNo: 0 });
  });
  const cum = cash;
  // Both drawn on « days since start », so the two horizons line up.
  const a = past.map((p) => ({ ...p, x: daysBetween(win[0].date, p.date) }));
  const b = steps.map((p) => ({ ...p, x: daysBetween(start, p.date) }));
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <b>{t("Le passé de l'un, la promesse de l'autre")}</b>
        <span>
          {t("même montant, même durée")} : {Math.round(horizon / 30)} {t("mois")}
        </span>
      </div>
      <DualChart series={[a, b]} labels={[t(fund.title), t(debt.title)]} fmtY={(v) => fmt(v)} xDays={horizon} zero={false} area="up" stepSecond />
      <div className={styles.keys}>
        <span>
          <i className={styles.a}>■</i> {t(fund.title)} · {past.length ? `${fmt(past[past.length - 1].y)} FCFA` : "—"} <small>({t("passé")}, {fmtDate(win[0]?.date ?? last, false)} → {fmtDate(last, false)})</small>
        </span>
        <span>
          <i className={styles.b}>■</i> {t(debt.title)} · {fmt(cum)} FCFA <small>({t("promesse")}, {fmtDate(start, false)} → {fmtDate(end, false)})</small>
        </span>
      </div>
      <p className={styles.how}>
        <b>{t("Comment lire")}</b> — {t("Le titre de dette n'a pas de courbe : il a des dates. Sa ligne monte en marches à chaque coupon et saute au remboursement ; elle vaut si l'émetteur paie. Le fonds en face montre ce qu'il a fait sur une durée égale, dans le passé : ce n'est pas ce qu'il fera. Aucune des deux lignes n'est une prévision.")}
      </p>
    </div>
  );
}

/* ---------- 4. the cash-flow calendar ---------- */
const KIND: Record<FlowItem["kind"], string> = { sortie: "Décaissement", coupon: "Coupon", capital: "Remboursement", dividende: "Dividende attendu", cession: "Produit de cession" };
function Calendar({ lines }: { lines: CompareLine[] }) {
  const t = useT();
  const [hover, setHover] = useState<{ l: number; i: number } | null>(null);
  const phone = usePhone();
  const calRef = useRef<SVGSVGElement>(null);
  useOutsideTap(calRef, hover != null, useCallback(() => setHover(null), []));
  const all = lines.flatMap((l) => l.flows!.items);
  const from = all.map((f) => f.date).sort()[0];
  const to = all.map((f) => f.date).sort().pop()!;
  const span = Math.max(30, daysBetween(from, to));
  const maxAbs = Math.max(...all.map((f) => Math.abs(f.amount)));
  const W = phone ? 380 : 1000;
  const laneH = phone ? 76 : 84;
  const H = laneH * lines.length + 24;
  const padL = phone ? 12 : 24;
  const x = (d: string) => padL + ((W - padL - 24) * daysBetween(from, d)) / span;
  const ticks = useMemo(() => {
    const out: string[] = [];
    const d = new Date(from + "T00:00:00Z");
    const step = span > 900 ? 6 : span > 400 ? 3 : 1;
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1); // the first whole month after the start
    while (d.toISOString().slice(0, 10) <= to) {
      out.push(d.toISOString().slice(0, 10));
      d.setUTCMonth(d.getUTCMonth() + step);
    }
    return out;
  }, [from, to, span]);
  const h = hover ? lines[hover.l].flows!.items[hover.i] : null;
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <b>{t("Le calendrier des flux")}</b>
        <span>{lines.map((l) => t(l.flows!.title)).join(" · ")}</span>
      </div>
      <div className={styles.calWrap}>
        <svg ref={calRef} viewBox={`0 0 ${W} ${H}`} className={styles.cal} role="img" aria-label={t("Le calendrier des flux")}>
          {lines.map((l, li) => {
            const base = li * laneH + laneH / 2 + 4;
            return (
              <g key={l.id}>
                <line x1={padL} x2={W - 8} y1={base} y2={base} className={styles.calBase} />
                <text x={padL} y={li * laneH + 14} className={`${styles.calLabel} ${COLORS[li]}`}>
                  {t(l.title)}
                </text>
                {l.flows!.items.map((f, i) => {
                  const hgt = Math.max(3, (Math.abs(f.amount) / maxAbs) * (laneH / 2 - 16));
                  const on = hover?.l === li && hover.i === i;
                  return (
                    <g key={i} onMouseEnter={() => setHover({ l: li, i })} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover({ l: li, i })}>
                      <rect x={x(f.date) - (phone ? 3 : 5)} y={f.amount < 0 ? base : base - hgt} width={phone ? 6 : 10} height={hgt} className={`${f.amount < 0 ? styles.out : f.sure ? COLORS[li] + " " + styles.inFill : styles.maybe} ${on ? styles.calOn : ""}`} />
                      <rect x={x(f.date) - 12} y={li * laneH + 16} width={24} height={laneH - 16} fill="transparent" />
                      {!phone && Math.abs(f.amount) >= maxAbs * 0.25 && (
                        <text x={x(f.date)} y={f.amount < 0 ? base + hgt + 12 : base - hgt - 5} className={styles.calAmt} textAnchor={x(f.date) < padL + 40 ? "start" : x(f.date) > W - 60 ? "end" : "middle"}>
                          {f.amount < 0 ? "−" : "+"}
                          {(Math.abs(f.amount) / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {ticks.map((d) => (
            <text key={d} x={x(d)} y={H - 7} className={styles.calTick} textAnchor="middle">
              {fmtDate(d, span > 400).replace(/^1 /, "")}
            </text>
          ))}
        </svg>
        {h && hover && (
          <div className={`${q.tip} ${styles.calTip}`} style={{ left: `${(x(h.date) / W) * 100}%`, top: `${((hover.l * laneH + laneH / 2) / H) * 100}%` }} role="status">
            <b>
              {h.amount < 0 ? "−" : "+"}
              {fmt(Math.abs(h.amount))} FCFA
            </b>
            <span>
              {t(KIND[h.kind])} · {fmtDate(h.date)}
            </span>
            {!h.sure && <span>{t("attendu, pas promis")}</span>}
          </div>
        )}
      </div>
      <div className={styles.keys}>
        <span>
          <i className={styles.outKey}>■</i> {t("ce que vous payez")}
        </span>
        <span>
          <i className={styles.a}>■</i> <i className={styles.b}>■</i> {t("ce qui revient (coupons, remboursement)")}
        </span>
        <span>
          <i className={styles.maybeKey}>■</i> {t("attendu, pas promis (dividende)")}
        </span>
        {lines.map((l, i) => (
          <span key={l.id}>
            <i className={COLORS[i]}>■</i> {l.flows!.outlay > 0 ? `${fmt(l.flows!.outlay)} → ${fmt(l.flows!.back)} FCFA` : `${fmt(l.flows!.back)} FCFA ${t("encaissés")}`}
          </span>
        ))}
      </div>
      <p className={styles.how}>
        <b>{t("Comment lire")}</b> — {t("Une ligne de temps par titre : la barre rouge est ce que vous payez au règlement, les barres de couleur ce qui revient et quand — coupons, puis le capital au terme. La hauteur est proportionnelle au montant. C'est la question « quand l'argent revient » lue sans un seul pourcentage ; les montants sont bruts, pour un nominal de référence, et supposent que l'émetteur paie.")}
      </p>
    </div>
  );
}

/* ---------- the two-line frame ---------- */
type XY = SeriesPoint & { x?: number };
function DualChart({ series, labels, bench, fmtY, zero, area, xDays, stepSecond }: { series: XY[][]; labels: string[]; bench?: { label: string; at: (date: string) => number }; fmtY: (v: number) => string; zero: boolean; area: "up" | "down"; xDays?: number; stepSecond?: boolean }) {
  const t = useT();
  const ref = useRef<SVGSVGElement>(null);
  const [hx, setHx] = useState<number | null>(null);
  const phone = usePhone();
  useOutsideTap(ref, hx != null, useCallback(() => setHx(null), []));
  const W = phone ? 380 : 1000;
  const H = phone ? 170 : 220;
  const pad = 10;
  const fontPx = 11; // the frame is drawn at about 1:1 on a phone and 1:1.3 on a desktop, so one size reads on both
  const dates = [...new Set(series.flat().map((p) => p.date))].sort();
  const first = dates[0];
  const lastD = dates[dates.length - 1];
  const span = xDays ?? Math.max(1, daysBetween(first, lastD));
  const px = (p: XY) => p.x ?? daysBetween(first, p.date);
  const benchPts = bench ? dates.map((d) => ({ date: d, y: bench.at(d) })) : [];
  const ys = [...series.flat().map((p) => p.y), ...benchPts.map((p) => p.y), ...(zero ? [0] : [])];
  if (ys.length === 0) return <div className="empty">{t("Pas assez d'historique commun.")}</div>;
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (max === min) {
    max += 1;
    min -= 1;
  }
  const labelW = Math.max(fmtY(max).length, fmtY(min).length) * fontPx * 0.58 + 10;
  const padX = labelW;
  const x = (d: number) => padX + ((W - padX - pad) * d) / span;
  const y = (v: number) => H - pad - ((v - min) * (H - 2 * pad)) / (max - min);
  const path = (s: XY[], step?: boolean) => s.map((p, i) => `${i === 0 ? "M" : step ? "L" : "L"}${x(px(p)).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");
  const baseY = area === "down" ? y(Math.max(min, Math.min(max, 0))) : H - pad;
  const axis = axisLabel(dates);
  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    setHx(Math.max(0, Math.min(span, ((vx - padX) * span) / (W - padX - pad))));
  };
  // At the hovered x, the latest point of each line at or before it.
  const at = (s: XY[]) => (hx == null ? null : [...s].reverse().find((p) => px(p) <= hx) ?? null);
  const hovered = series.map(at);
  const anchor = hovered.find(Boolean);
  return (
    <div className={styles.dual}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H + 18}`} onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHx(null)} onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)} role="img" aria-label={labels.join(" / ")}>
        <line x1={padX} x2={W - pad} y1={y(max)} y2={y(max)} className={q.guide} />
        <line x1={padX} x2={W - pad} y1={y(min)} y2={y(min)} className={q.guide} />
        <text x={padX - 5} y={y(max) + 4} className={styles.tick} style={{ fontSize: fontPx }} textAnchor="end">
          {fmtY(max)}
        </text>
        <text x={padX - 5} y={y(min) + 4} className={styles.tick} style={{ fontSize: fontPx }} textAnchor="end">
          {fmtY(min)}
        </text>
        {zero && min < 0 && max > 0 && <line x1={padX} x2={W - pad} y1={y(0)} y2={y(0)} className={q.zero} />}
        {bench && <path d={path(benchPts.map((p) => ({ ...p, nav: 0, bulletinNo: 0 })))} className={q.bench} />}
        {series.map((s, i) =>
          s.length === 0 ? null : (
            <g key={i}>
              {area === "down" ? <path d={`${path(s)} L${x(px(s[s.length - 1])).toFixed(1)} ${baseY} L${x(px(s[0])).toFixed(1)} ${baseY} Z`} className={i === 0 ? styles.areaA : styles.areaB} /> : null}
              <path d={path(s, stepSecond && i === 1)} className={`${styles.line} ${COLORS[i]}`} />
              <circle cx={x(px(s[s.length - 1]))} cy={y(s[s.length - 1].y)} r={3.5} className={`${styles.end} ${COLORS[i]}`} />
            </g>
          ),
        )}
        {hx != null && <line x1={x(hx)} x2={x(hx)} y1={pad} y2={H - pad} className={q.cursor} />}
        {hovered.map((p, i) => (p ? <circle key={i} cx={x(px(p))} cy={y(p.y)} r={4} className={`${styles.end} ${COLORS[i]}`} /> : null))}
        {(xDays
          ? [0, 0.25, 0.5, 0.75, 1].map((k) => ({ d: k * span, label: `${Math.round((k * span) / 30)} ${t("mois")}` }))
          : axis.ticks.map((i) => ({ d: daysBetween(first, dates[i]), label: axis.label(dates[i]) }))
        ).map((tk, i, arr) => (
          <text key={i} x={x(tk.d)} y={H + 14} className={styles.tick} style={{ fontSize: fontPx }} textAnchor={i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle"}>
            {tk.label}
          </text>
        ))}
      </svg>
      {anchor && hx != null && (
        <div className={`${q.tip} ${x(hx) > W * 0.7 ? q.tipLeft : x(hx) < W * 0.3 ? q.tipRight : ""}`} style={{ left: `${(x(hx) / W) * 100}%`, top: `${(y(anchor.y) / (H + 18)) * 100}%` }} role="status">
          {hovered.map((p, i) =>
            p ? (
              <span key={i}>
                <i className={COLORS[i]}>■</i> {labels[i]} : <b>{fmtY(p.y)}</b> · {xDays ? `${Math.round(px(p) / 30)} ${t("mois")}` : fmtDate(p.date)}
              </span>
            ) : null,
          )}
          {bench && anchor.date && (
            <span>
              <i className={styles.bench}>┄</i> {bench.label} : {fmtY(bench.at(anchor.date))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
