"use client";

import { useT } from "@/i18n/client";
import { fmt, fmtDate } from "@/lib/format";
import type { FundCurve } from "@/lib/domain/fund-curve";
import type { BackFacts } from "@/lib/domain/back";
import styles from "./CardBack.module.css";

/**
 * The back of a card, the same for every instrument and filled with what
 * exists: the calendar of an operation with its current step (or the dated
 * facts of a line that has none), and the reference calculation of the
 * fiche, always. No curve for securities (over sixty sessions most were
 * straight lines); a fund keeps its NAV curve.
 * In compact view the list's figures open it (minus the yield, which the
 * front already shows), since the front then shows only the title and the
 * yield. The first section keeps clear of the corner (status, dots, icon).
 *
 * La courbe d'un fonds arrive avec la page, déjà réduite aux valeurs et aux
 * deux dates qui se dessinent. Elle était auparavant demandée au serveur au
 * premier retournement : la carte s'ouvrait sur « Courbe en cours de lecture… »
 * et il fallait attendre une lecture complète pour voir un trait.
 */
export function CardBack({ facts, figures, curve }: { facts: BackFacts; figures?: [string, string, string?][]; curve?: FundCurve }) {
  const t = useT();
  return (
    <div className={styles.back}>
      {figures && (
        <div className={`${styles.sec} ${styles.first}`}>
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
        <div className={`${styles.sec} ${figures ? "" : styles.first}`}>
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
      {facts.lines && (
        <div className={`${styles.sec} ${figures || facts.calendar ? "" : styles.first}`}>
          {facts.lines.map(([k, v]) => (
            <div key={k} className={styles.kv}>
              <span>{t(k)}</span>
              <b>{t(v)}</b>
            </div>
          ))}
        </div>
      )}
      {curve && (
        <div className={styles.sec}>
          <div className={styles.lbl}>
            {t("Valeurs liquidatives")}
            <i>{curve.ys.length} VL</i>
          </div>
          <Spark curve={curve} />
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

function fmtY(v: number): string {
  return fmt(v);
}

/** A small line: the last point in gold with its value, the first and last dates underneath; the label steps aside from the edges and the line. */
function Spark({ curve }: { curve: FundCurve }) {
  const t = useT();
  const ys = curve.ys;
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const x = (i: number) => PAD_L + (ys.length > 1 ? (i / (ys.length - 1)) * (W - PAD_L - PAD_R) : (W - PAD_L - PAD_R) / 2);
  const y = (v: number) => PAD_T + (1 - (max === min ? 0.5 : (v - min) / (max - min))) * (H - PAD_T - PAD_B);
  const d = ys.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const lx = x(ys.length - 1);
  const ly = y(ys[ys.length - 1]);
  const label = fmtY(ys[ys.length - 1]);
  const labelW = label.length * 5.6 + 6;
  // The value sits left of the dot, in whichever band the line leaves free over its last third: above its highest
  // point there when there is more room above, under its lowest point otherwise; never on the line, never on the dates.
  const tail = ys.filter((_, i) => x(i) >= lx - labelW - 10).map((v) => y(v));
  const topY = Math.min(...tail);
  const botY = Math.max(...tail);
  const roomAbove = topY - PAD_T;
  const roomBelow = H - PAD_B - botY;
  const tx = Math.max(PAD_L + labelW, lx - 8);
  const ty = roomAbove >= roomBelow ? Math.max(PAD_T + 8, topY - 5) : Math.min(H - PAD_B - 2, botY + 12);
  return (
    <svg className={styles.spark} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t("Valeurs liquidatives")} : ${label}`}>
      <path d={d} fill="none" stroke="var(--chart-out)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3.5" fill="var(--gold)" stroke="var(--info-soft)" strokeWidth="1.5" />
      <text x={tx} y={ty} textAnchor="end" fontSize="9.5" fontWeight="700" fill="var(--gold-ink)" style={{ fontSize: 9.5 }}>
        {label}
      </text>
      <text x={PAD_L} y={H - 4} fontSize="8.5" fill="var(--ink-2)" style={{ fontSize: 8.5 }}>
        {fmtDate(curve.from, false)}
      </text>
      <text x={W - PAD_R} y={H - 4} textAnchor="end" fontSize="8.5" fill="var(--ink-2)" style={{ fontSize: 8.5 }}>
        {fmtDate(curve.to, false)}
      </text>
    </svg>
  );
}
