"use client";

import { useT } from "@/i18n/client";
import { useEffect, useRef, useState } from "react";
import { lineCurve, type LineCurve } from "@/app/offres/[id]/actions";
import type { BackFacts } from "@/lib/domain/back";
import { fmt, fmtDate, fmtPct, fmtPrice } from "@/lib/format";
import styles from "./CardBack.module.css";

/**
 * The back of a card, the same for every instrument and filled with what
 * exists: the calendar of an operation with its current step (or the dated
 * facts of a line that has none), the curve when the line has a past
 * (fetched the first time the card turns), and the reference calculation
 * of the fiche, always. In compact view the four figures of the list open
 * it, since the front then shows only the title and the yield.
 */
export function CardBack({ id, facts, figures, turned }: { id: string; facts: BackFacts; figures?: [string, string, string?][]; turned: boolean }) {
  const t = useT();
  const [curve, setCurve] = useState<LineCurve | null | "loading" | "idle">("idle");
  const asked = useRef(false);
  useEffect(() => {
    if (!turned || asked.current) return;
    asked.current = true;
    // The curve is fetched the first time the card turns; the calendar and the reference are there at once.
    const timer = window.setTimeout(() => setCurve((c) => (c === "idle" ? "loading" : c)), 0);
    lineCurve(id)
      .then((c) => setCurve(c))
      .catch(() => setCurve(null));
    return () => clearTimeout(timer);
  }, [turned, id]);
  return (
    <div className={styles.back}>
      {figures && (
        <div className={styles.sec}>
          <div className={styles.grid}>
            {figures.map(([k, v, note]) => (
              <div key={k}>
                <span>{t(k)}</span>
                <b>{v}</b>
                {note && <em>{t(note)}</em>}
              </div>
            ))}
          </div>
        </div>
      )}
      {facts.calendar && (
        <div className={styles.sec}>
          <div className={styles.lbl}>
            {t("Calendrier")}
            {facts.calendar.some((s) => s.state === "on") && <i>{t("étape en cours")}</i>}
          </div>
          <div className={styles.tl} style={{ ["--n" as string]: facts.calendar.length }}>
            {facts.calendar.map((s) => (
              <div key={s.label} className={s.state === "on" ? styles.on : s.state === "done" ? styles.done : undefined}>
                <span>{t(s.label)}</span>
                <b>{t(s.when)}</b>
              </div>
            ))}
          </div>
        </div>
      )}
      {curve !== "idle" && curve !== "loading" && curve && (
        <div className={styles.sec}>
          <div className={styles.lbl}>
            {t(curve.label)}
            <i>{curve.points.length} {t(curve.unit === "pct" ? "adjudications" : curve.unit === "nav" ? "VL" : "séances")}</i>
          </div>
          <Spark curve={curve} />
        </div>
      )}
      {curve === "loading" && <div className={`${styles.sec} ${styles.muted}`}>{t("Courbe en cours de lecture…")}</div>}
      {facts.lines && (
        <div className={styles.sec}>
          {facts.lines.map(([k, v]) => (
            <div key={k} className={styles.kv}>
              <span>{t(k)}</span>
              <b>{t(v)}</b>
            </div>
          ))}
        </div>
      )}
      <div className={styles.sec}>
        <div className={styles.lbl}>{t(facts.reference.title)}</div>
        <div className={styles.calc}>
          {facts.reference.rows.map(([k, v, total]) => (
            <div key={k} className={total ? styles.tot : undefined}>
              <span>{t(k)}</span>
              <b>{t(v)}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const W = 300;
const H = 64;
const PAD_L = 6;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 16; // room for the two dates

function fmtY(v: number, unit: LineCurve["unit"]): string {
  return unit === "pct" ? fmtPct(v, 2) : unit === "price" ? fmtPrice(v) : fmt(v);
}

/** A small line: the last point in gold with its value, the first and last dates underneath; the label steps aside from the edges and the line. */
function Spark({ curve }: { curve: LineCurve }) {
  const pts = curve.points;
  const ys = pts.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const x = (i: number) => PAD_L + (pts.length > 1 ? (i / (pts.length - 1)) * (W - PAD_L - PAD_R) : (W - PAD_L - PAD_R) / 2);
  const y = (v: number) => PAD_T + (1 - (max === min ? 0.5 : (v - min) / (max - min))) * (H - PAD_T - PAD_B);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");
  const lx = x(pts.length - 1);
  const ly = y(pts[pts.length - 1].y);
  const label = fmtY(pts[pts.length - 1].y, curve.unit);
  const labelW = label.length * 5.6 + 6;
  // The value sits left of the dot (the dot is at the right edge), above the line when the line is low, below when it is high.
  const above = ly > (H - PAD_B) / 2 + PAD_T / 2;
  const tx = Math.max(PAD_L + labelW, lx - 8);
  const ty = above ? ly - 7 : ly + 12;
  return (
    <svg className={styles.spark} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${curve.label} : ${label}`}>
      <path d={d} fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3.5" fill="var(--gold)" stroke="var(--surface-2)" strokeWidth="1.5" />
      <text x={tx} y={ty} textAnchor="end" fontSize="9.5" fontWeight="700" fill="var(--gold-ink)" style={{ fontSize: 9.5 }}>
        {label}
      </text>
      <text x={PAD_L} y={H - 4} fontSize="8.5" fill="var(--ink-3)" style={{ fontSize: 8.5 }}>
        {fmtDate(pts[0].x, false)}
      </text>
      <text x={W - PAD_R} y={H - 4} textAnchor="end" fontSize="8.5" fill="var(--ink-3)" style={{ fontSize: 8.5 }}>
        {fmtDate(pts[pts.length - 1].x, false)}
      </text>
    </svg>
  );
}
