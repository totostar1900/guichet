"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { NavChart, type NavPoint } from "./NavChart";
import { type Benchmark, type ChartMode, changes, drawdown, FundChart, invested, MODE_LABEL, REF_AMOUNT, rollingAnnualised } from "./FundCharts";
import { daysBetween } from "@/lib/finance";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./QuoteHistory.module.css";
import { useT } from "@/i18n/client";

/**
 * The window of the NAV chart: six durations or two free dates, kept in the
 * URL (`periode=1a` | `du=…&au=…`) so a view can be shared. Every figure of
 * the block on the right is computed on the NAVs published inside that
 * window; the bulletin's own figures stay untouched underneath.
 */
type Duration = "1m" | "3m" | "6m" | "1a" | "3a" | "origine";
const DURATIONS: [Duration, string, number][] = [
  ["1m", "1 mois", 31],
  ["3m", "3 mois", 92],
  ["6m", "6 mois", 183],
  ["1a", "1 an", 365],
  ["3a", "3 ans", 1096],
  // Pas « Origine » : cette borne est la première VL que nous ayons lue, pas la
  // naissance du fonds. Le chiffre du bulletin, lui, court depuis la création,
  // et les deux ne coïncident que pour un fonds aussi jeune que nos relevés.
  ["origine", "Tout l'historique", Infinity],
];
/**
 * Le nom long ne tient pas sur un téléphone en portrait : six boutons dont
 * un de seize caractères demandent environ 430 px quand l'écran en offre
 * 343. Le mot court paraît sous 480 px, le long au-dessus ; « Tout » ne dit
 * rien de faux à côté de 1 mois, 3 mois, 6 mois, 1 an et 3 ans.
 */
const SHORT: Partial<Record<Duration, string>> = { origine: "Tout" };
const REF = REF_AMOUNT;
const MODES: ChartMode[] = ["vl", "rendement", "placement", "variations", "repli"];
const WINDOWS: [string, number][] = [
  ["3 mois", 92],
  ["6 mois", 183],
  ["12 mois", 365],
];

const signed = (v?: number, d = 2) => (v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const cls = (v?: number) => (v == null || v === 0 ? undefined : v > 0 ? styles.up : styles.down);
const shift = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

/** The published date closest to the one asked for. */
const nearest = (dates: string[], iso: string) => dates.reduce((best, d) => (Math.abs(daysBetween(d, iso)) < Math.abs(daysBetween(best, iso)) ? d : best), dates[0]);

export function NavPeriod({ series, benchmark, narrow }: { series: NavPoint[]; benchmark?: Benchmark; narrow?: boolean }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const dates = series.map((p) => p.date); // oldest → newest
  const first = dates[0];
  const last = dates[dates.length - 1];
  const span = daysBetween(first, last);

  // What the URL says, else one year when the history allows, else the whole history.
  const available = (d: Duration) => d === "origine" || span >= DURATIONS.find(([k]) => k === d)![2] * 0.9;
  const asked = sp.get("periode") as Duration | null;
  const du = sp.get("du");
  const au = sp.get("au");
  const custom = Boolean(du || au);
  const fallback: Duration = available("1a") ? "1a" : "origine";
  const duration: Duration = custom ? "origine" : asked && DURATIONS.some(([k]) => k === asked) && available(asked) ? asked : fallback;
  const from = custom ? nearest(dates, du ?? first) : duration === "origine" ? first : nearest(dates, shift(last, DURATIONS.find(([k]) => k === duration)![2]));
  const to = custom ? nearest(dates, au ?? last) : last;
  const [a, b] = from <= to ? [from, to] : [to, from];
  const window_ = useMemo(() => series.filter((p) => p.date >= a && p.date <= b), [series, a, b]);

  // Which reading of the window, and, for the rolling return, how long each look-back is.
  const modeAsked = sp.get("graphe") as ChartMode | null;
  const mode: ChartMode = modeAsked && MODES.includes(modeAsked) ? modeAsked : "vl";
  const winAsked = Number(sp.get("fenetre"));
  const winOk = (d: number) => span >= d * 1.2; // the rolling return needs the window plus some room
  const windowDays = WINDOWS.some(([, d]) => d === winAsked) && winOk(winAsked) ? winAsked : winOk(365) ? 365 : winOk(183) ? 183 : 92;
  const plotted = useMemo(() => {
    if (mode === "rendement") return rollingAnnualised(series, windowDays).filter((p) => p.date >= a && p.date <= b);
    if (mode === "placement") return invested(window_);
    if (mode === "variations") return changes(window_);
    if (mode === "repli") return drawdown(window_);
    return [];
  }, [mode, series, window_, windowDays, a, b]);

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  // The figures of the window.
  const s = useMemo(() => {
    if (window_.length === 0) return null;
    const f = window_[0];
    const l = window_[window_.length - 1];
    const days = daysBetween(f.date, l.date);
    const perf = f.nav > 0 ? (l.nav / f.nav - 1) * 100 : 0;
    const annual = days >= 30 && f.nav > 0 ? (Math.pow(l.nav / f.nav, 365 / days) - 1) * 100 : undefined;
    const hi = window_.reduce((m, p) => (p.nav > m.nav ? p : m), f);
    const lo = window_.reduce((m, p) => (p.nav < m.nav ? p : m), f);
    const moves = window_.slice(1).map((p, i) => ({ date: p.date, pct: window_[i].nav > 0 ? (p.nav / window_[i].nav - 1) * 100 : 0 }));
    const avg = moves.length ? moves.reduce((x, m) => x + m.pct, 0) / moves.length : undefined;
    const down = moves.filter((m) => m.pct < 0);
    const worst = moves.length ? moves.reduce((m, x) => (x.pct < m.pct ? x : m), moves[0]) : undefined;
    return { f, l, days, perf, annual, hi, lo, avg, down: down.length, moves: moves.length, worst, placed: f.nav > 0 ? (REF * l.nav) / f.nav : undefined };
  }, [window_]);

  // One line under the chart that says what the reading shows.
  const headline = (() => {
    if (plotted.length === 0) return null;
    const l = plotted[plotted.length - 1];
    if (mode === "rendement") return { text: t("Aujourd'hui : {r} par an sur les {n} derniers jours", { r: signed(l.y), n: String(windowDays) }), v: l.y };
    if (mode === "placement") return { text: t("{a} FCFA placés le {d} valent {b} FCFA", { a: fmt(REF), d: fmtDate(plotted[0].date), b: fmt(l.y) }), v: l.y - REF };
    if (mode === "variations") {
      const down = plotted.filter((p) => p.y < 0);
      const worst = plotted.reduce((m, p) => (p.y < m.y ? p : m), plotted[0]);
      return { text: t("{d} baisses sur {n} VL · plus forte {w} ({date})", { d: String(down.length), n: String(plotted.length), w: signed(worst.y), date: fmtDate(worst.date, false) }), v: -down.length };
    }
    const worst = plotted.reduce((m, p) => (p.y < m.y ? p : m), plotted[0]);
    if (worst.y === 0) return { text: t("Jamais sous son plus haut sur la période"), v: 0 };
    const after = plotted.slice(plotted.indexOf(worst)).find((p) => p.y === 0);
    return { text: after ? t("Pire repli {w} le {d}, comblé le {r}", { w: signed(worst.y), d: fmtDate(worst.date, false), r: fmtDate(after.date, false) }) : t("Pire repli {w} le {d}, pas encore comblé", { w: signed(worst.y), d: fmtDate(worst.date, false) }), v: worst.y };
  })();

  return (
    <div className={`${styles.period} ${narrow ? styles.periodNarrow : ""}`}>
      <div className={styles.modes} role="group" aria-label={t("Graphique")} data-coach="fund-modes">
        {MODES.map((m) => (
          <button key={m} type="button" className={mode === m ? styles.on : ""} aria-pressed={mode === m} onClick={() => update({ graphe: m === "vl" ? undefined : m })}>
            {t(MODE_LABEL[m])}
          </button>
        ))}
        {mode === "rendement" && (
          <span className={styles.windowPick}>
            <span title={t("La durée sur laquelle chaque point mesure : une fenêtre de 12 mois trace, à chaque date, le rendement des douze mois qui la précèdent. La période ci-dessous choisit les dates montrées, la fenêtre choisit ce que chacune mesure.")}>{t("fenêtre de calcul")}</span>
            {WINDOWS.map(([label, d]) => (
              <button key={d} type="button" className={windowDays === d ? styles.on : ""} aria-pressed={windowDays === d} disabled={!winOk(d)} onClick={() => update({ fenetre: d === 365 ? undefined : String(d) })}>
                {t(label)}
              </button>
            ))}
          </span>
        )}
      </div>
      <div className={styles.periodBar}>
        <div className={styles.durations} role="group" aria-label={t("Durée")}>
          {DURATIONS.map(([k, label]) => (
            <button key={k} type="button" className={!custom && duration === k ? styles.on : ""} aria-pressed={!custom && duration === k} disabled={!available(k)} title={available(k) ? undefined : t("Historique trop court")} onClick={() => update({ periode: k === fallback ? undefined : k, du: undefined, au: undefined })}>
              {SHORT[k] ? (
                <>
                  <span className={styles.wide}>{t(label)}</span>
                  <span className={styles.narrow}>{t(SHORT[k]!)}</span>
                </>
              ) : (
                t(label)
              )}
            </button>
          ))}
        </div>
        <span className={styles.periodOr}>{t("ou")}</span>
        <label className={styles.dateField}>
          <span>{t("du")}</span>
          <input type="date" value={a} min={first} max={last} onChange={(e) => e.target.value && update({ du: e.target.value, au: b, periode: undefined })} />
        </label>
        <label className={styles.dateField}>
          <span>{t("au")}</span>
          <input type="date" value={b} min={first} max={last} onChange={(e) => e.target.value && update({ du: a, au: e.target.value, periode: undefined })} />
        </label>
        <span className={styles.periodCount}>
          {t("{n} VL publiées sur la période", { n: window_.length })} · {fmtDate(a)} → {fmtDate(b)}
          {duration === "origine" && !custom ? ` · ${t("depuis notre première VL lue, pas depuis la création du fonds")}` : ""}
        </span>
      </div>

      <div className={styles.periodGrid}>
        <div className={`${styles.chart} ${styles.navBlock}`}>
          {window_.length > 0 ? (
            <>
              {mode === "vl" ? <NavChart series={window_} sinceStart onRange={(from, to) => update({ du: from, au: to, periode: undefined })} /> : <FundChart mode={mode} series={plotted} benchmark={benchmark} windowDays={windowDays} onRange={(from, to) => update({ du: from, au: to, periode: undefined })} />}
              {mode !== "vl" && headline && (
                <div className={styles.legend}>
                  <span>{MODE_HINT[mode] ? t(MODE_HINT[mode]) : null}</span>
                  <b className={cls(headline.v)}>{headline.text}</b>
                </div>
              )}
              {mode === "vl" && s && (
                <div className={styles.legend}>
                  <span>
                    {t("{n} VL sur la période · plus haut {hi} ({a}) · plus bas {lo} ({b})", { n: window_.length, hi: fmt(s.hi.nav), a: fmtDate(s.hi.date), lo: fmt(s.lo.nav), b: fmtDate(s.lo.date) })}
                  </span>
                  <b className={cls(s.perf)} title={t("Variation de la VL entre la première et la dernière date affichées")}>
                    {signed(s.perf)}
                  </b>
                </div>
              )}
            </>
          ) : (
            <div className="empty">{t("Aucune VL publiée sur cette période.")}</div>
          )}
        </div>
        {s && (
          <div className={styles.periodStats}>
            <span className="eyebrow">{t("Sur la période choisie")}</span>
            <dl className={styles.periodDl}>
              <div>
                <dt>{t("Performance")}</dt>
                <dd className={cls(s.perf)}>{signed(s.perf)}</dd>
              </div>
              <div>
                <dt>{t("Annualisée")}</dt>
                <dd>{s.annual == null ? "—" : signed(s.annual)}</dd>
              </div>
              <div>
                <dt>{t("VL début → fin")}</dt>
                <dd>
                  {fmt(s.f.nav)} → {fmt(s.l.nav)}
                </dd>
              </div>
              <div>
                <dt>{t("Plus haut · plus bas")}</dt>
                <dd>
                  {fmt(s.hi.nav)} · {fmt(s.lo.nav)}
                </dd>
              </div>
              <div>
                <dt>{t("Variation moyenne / VL")}</dt>
                <dd>{signed(s.avg)}</dd>
              </div>
              <div>
                <dt>{t("VL en baisse")}</dt>
                <dd>
                  {s.down} {t("sur")} {s.moves}
                </dd>
              </div>
              <div>
                <dt>{t("Plus forte baisse")}</dt>
                <dd className={s.worst && s.worst.pct < 0 ? styles.down : undefined}>{s.worst && s.worst.pct < 0 ? `${signed(s.worst.pct)} (${fmtDate(s.worst.date, false)})` : "—"}</dd>
              </div>
              <div>
                <dt>{t("{n} FCFA placés", { n: fmt(REF) })}</dt>
                <dd>{s.placed == null ? "—" : `${fmt(s.placed)} FCFA`}</dd>
              </div>
            </dl>
            <p className={styles.periodNote}>{t("Chiffres bruts, calculés sur les VL publiées au bulletin, avant droits d'entrée et de sortie et fiscalité ; le montant placé suppose une souscription à la première VL de la période. Les performances passées ne préjugent pas des performances futures.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const MODE_HINT: Record<ChartMode, string> = {
  vl: "",
  rendement: "À chaque date, le rendement annualisé de la fenêtre qui précède.",
  placement: "Ce que serait devenu le montant placé à la première VL de la période, brut, avant frais.",
  variations: "L'écart entre chaque VL et la précédente.",
  repli: "À chaque date, l'écart entre la VL et le plus haut atteint avant elle sur la période.",
};
