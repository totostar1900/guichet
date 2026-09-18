"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { NavChart, type NavPoint } from "./NavChart";
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
  ["origine", "Origine", Infinity],
];
const REF = 1_000_000;

const signed = (v?: number, d = 2) => (v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const cls = (v?: number) => (v == null || v === 0 ? undefined : v > 0 ? styles.up : styles.down);
const shift = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

/** The published date closest to the one asked for. */
const nearest = (dates: string[], iso: string) => dates.reduce((best, d) => (Math.abs(daysBetween(d, iso)) < Math.abs(daysBetween(best, iso)) ? d : best), dates[0]);

export function NavPeriod({ series }: { series: NavPoint[] }) {
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

  return (
    <div className={styles.period}>
      <div className={styles.periodBar}>
        <div className={styles.durations} role="group" aria-label={t("Durée")}>
          {DURATIONS.map(([k, label]) => (
            <button key={k} type="button" className={!custom && duration === k ? styles.on : ""} aria-pressed={!custom && duration === k} disabled={!available(k)} title={available(k) ? undefined : t("Historique trop court")} onClick={() => update({ periode: k === fallback ? undefined : k, du: undefined, au: undefined })}>
              {t(label)}
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
        </span>
      </div>

      <div className={styles.periodGrid}>
        <div className={`${styles.chart} ${styles.navBlock}`}>
          {window_.length > 0 ? (
            <>
              <NavChart series={window_} sinceStart />
              {s && (
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
