"use client";

import { useState } from "react";
import { fmt, fmtPct, fmtScaled, pickScale } from "@/lib/format";
import { GRAPHE_L } from "@/lib/ui/graphe";
import styles from "./periode.module.css";

/**
 * « À QUELLE PROFONDEUR » AVEC SON COMMUTATEUR (8 novembre 2026) : le même dessin lit trois grandeurs de négoce, une à la fois : le montant moyen d'une transaction (par défaut), le montant
 * échangé, le nombre de transactions. Les sociétés restent dans le même ordre que les autres graphiques de la page.
 */
type Mode = "moyen" | "total" | "trans";
export interface Libelles {
  titreMoyen: string;
  titreTotal: string;
  titreTrans: string;
  axeMoyen: string;
  axeTotal: string;
  axeTrans: string;
  moyen: string;
  total: string;
  trans: string;
  legMoyen: string;
  legTotal: string;
  legTrans: string;
  groupe: string;
}
const TXT = { fontSize: "var(--graphe-texte)" } as const;
const W = GRAPHE_L;
const RH = 24;
const T = 34;
const LAB = 46;
const dec1 = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Le premier sommet rond au-dessus de `v` : des graduations qu'on lit. */
const rond = (v: number) => {
  const m = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9)));
  return [1, 2, 2.5, 5, 10].map((k) => k * m).find((x) => x >= v - 1e-9) ?? 10 * m;
};

export function Profondeur({ societes, l }: { societes: { mnemo: string; moyen: number; amount: number; trades: number }[]; l: Libelles }) {
  const [mode, setMode] = useState<Mode>("moyen");
  const n = societes.length;
  if (n === 0) return null;
  const bas = T + n * RH;
  const H = bas + 24;
  const tot = societes.reduce((a, s) => a + s.amount, 0);
  const valeur = (s: (typeof societes)[number]) => (mode === "moyen" ? s.moyen : mode === "total" ? s.amount : s.trades);
  const sc = pickScale(societes.map((s) => valeur(s)));
  const div = mode === "trans" ? 1 : sc.div;
  const max = rond(Math.max(1, ...societes.map((s) => valeur(s) / div))) * div;
  const x0 = LAB + 8;
  const x1 = 220;
  const x = (v: number) => x0 + (v / max) * (x1 - x0);
  const unite = mode === "trans" ? "" : sc.short;
  const axe = mode === "moyen" ? l.axeMoyen : mode === "total" ? l.axeTotal : l.axeTrans;
  const titre = mode === "moyen" ? l.titreMoyen : mode === "total" ? l.titreTotal : l.titreTrans;
  const leg = mode === "moyen" ? l.legMoyen : mode === "total" ? l.legTotal : l.legTrans;
  const fm = (v: number) => (mode === "trans" ? fmt(v) : fmtScaled(v, div, div === 1 ? 0 : 1));
  const MODES: [Mode, string][] = [
    ["moyen", l.moyen],
    ["total", l.total],
    ["trans", l.trans],
  ];
  return (
    <figure className={styles.figure}>
      <div className={styles.titre}>{titre}</div>
      <div className={styles.commutateur} role="group" aria-label={l.groupe}>
        {MODES.map(([k, lab]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}>
            {lab}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={societes.map((s) => `${s.mnemo} ${fm(valeur(s))} ${unite}`).join(", ")}>
        <text x={2} y={11} fill="var(--ink-2)" style={TXT}>
          {axe.replace("{u}", unite)}
        </text>
        {[0, max / 2, max].map((v, i) => (
          <g key={i}>
            <line x1={x(v)} x2={x(v)} y1={T} y2={bas} stroke="var(--line)" strokeWidth={1} />
            <text x={x(v)} y={bas + 13} textAnchor="middle" fill="var(--ink-3)" style={TXT}>
              {mode === "trans" ? fmt(v) : fmtScaled(v, div, div === 1 ? 0 : 1)}
            </text>
          </g>
        ))}
        {societes.map((s, i) => (
          <text key={s.mnemo} x={LAB} y={T + i * RH + RH / 2 + 4} textAnchor="end" fill="var(--ink)" style={{ ...TXT, fontWeight: 700 }}>
            {s.mnemo}
          </text>
        ))}
        {societes.map((s, i) => {
          const y = T + i * RH + 5;
          const v = valeur(s);
          return (
            <g key={s.mnemo}>
              <rect x={x0} y={y} width={Math.max(v ? 1.5 : 0, x(v) - x0)} height={13} rx={2} fill="var(--chart-out)" />
              <text x={x(v) + 4} y={y + 10} fill="var(--ink-2)" style={{ fontSize: "var(--graphe-valeur)" }}>
                {v ? (mode === "moyen" ? `${dec1(v / div)} · ${s.trades}` : mode === "total" ? `${fm(v)} · ${fmtPct(tot ? (v / tot) * 100 : 0, 0)}` : fmt(v)) : "—"}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={styles.legende}>{leg}</p>
    </figure>
  );
}
