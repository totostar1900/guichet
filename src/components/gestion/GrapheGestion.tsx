"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import type { FormeDeGraphe } from "@/lib/domain/gestionnaire";
import styles from "./GrapheGestion.module.css";

export interface SerieDuGraphe {
  nom: string;
  /** Un nombre par jour, ou `null` quand le jour n'est pas dit (porteurs sous cinq). */
  valeurs: (number | null)[];
  /** `0` : la teinte d'or ; `1` : l'encre. Jamais la seule différence : la légende écrit chaque nom. */
  teinte: 0 | 1;
}

/** Un montant en francs, abrégé : 412 M, 1,2 Md. */
export const abrege = (n: number): string => {
  const a = Math.abs(n);
  const f = (v: number, u: string) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: v >= 100 ? 0 : 1 })} ${u}`.trim();
  return a >= 1e9 ? f(n / 1e9, "Md") : a >= 1e6 ? f(n / 1e6, "M") : a >= 1e3 ? f(n / 1e3, "k") : String(Math.round(n));
};

/** Une borne « ronde » au-dessus du maximum : 1, 2, 2,5, 5 × 10ⁿ. */
const borne = (max: number): number => {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

const L = 600;
const H = 220;
const G = 52;
const D = 24;
const B = 24;
const TOP = 10;

/**
 * LE GRAPHE DU GESTIONNAIRE : TROIS FORMES D'UNE MÊME SÉRIE (28 novembre 2026) : une courbe, des aires, des barres. Un axe, une échelle, des repères aux bornes ; le jour touché se lit en toutes lettres sous le
 * dessin. Les couleurs ne portent rien seules : une légende écrit chaque nom, et la lecture du jour redit chaque valeur. Un jour « non dit » (porteurs sous cinq) est un trou, jamais un zéro.
 */
export function GrapheGestion({ jours, series, forme, unite }: { jours: string[]; series: SerieDuGraphe[]; forme: FormeDeGraphe; unite: string }) {
  const t = useT();
  const { fmtDate } = useDates();
  const [touche, setTouche] = useState<number | null>(null);
  const n = jours.length;
  const tous = series.flatMap((s) => s.valeurs.filter((v): v is number => v != null));
  if (n < 2 || tous.length === 0) return <p className={styles.vide}>{t("Pas encore de donnée sur cette période.")}</p>;
  if (tous.every((v) => v === 0)) return <p className={styles.vide}>{t("Rien à tracer sur cette période : tous les jours valent zéro.")}</p>;
  const max = borne(Math.max(...tous, 0));
  const x = (i: number) => G + (i / (n - 1)) * (L - G - D);
  const y = (v: number) => H - B - (v / max) * (H - B - TOP);
  const pas = (L - G - D) / n;
  const trace = (s: SerieDuGraphe) => {
    const parties: string[] = [];
    let ouverte: string[] = [];
    s.valeurs.forEach((v, i) => {
      if (v == null) {
        if (ouverte.length) parties.push(ouverte.join(" "));
        ouverte = [];
      } else ouverte.push(`${ouverte.length ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    });
    if (ouverte.length) parties.push(ouverte.join(" "));
    return parties;
  };
  const graduations = [0, 0.5, 1].map((k) => k * max);
  const lecture = touche != null ? series.map((s) => `${t(s.nom)} : ${s.valeurs[touche] == null ? t("moins de cinq") : `${abrege(s.valeurs[touche] as number)} ${unite}`.trim()}`).join(" · ") : null;
  return (
    <figure className={styles.figure}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${L} ${H}`}
        role="img"
        aria-label={series.map((s) => t(s.nom)).join(", ")}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * L;
          setTouche(Math.max(0, Math.min(n - 1, Math.round(((px - G) / (L - G - D)) * (n - 1)))));
        }}
        onPointerLeave={() => setTouche(null)}
      >
        {graduations.map((g) => (
          <g key={g}>
            <line className={styles.grille} x1={G} x2={L - D} y1={y(g)} y2={y(g)} />
            <text className={styles.repere} x={G - 6} y={y(g) + 3} textAnchor="end">
              {abrege(g)}
            </text>
          </g>
        ))}
        {forme === "barres" &&
          series.map((s, k) =>
            s.valeurs.map((v, i) =>
              v == null ? null : <rect key={`${k}-${i}`} className={s.teinte === 0 ? styles.or : styles.encre} x={x(i) - pas / 2 + (k * pas) / series.length} y={y(v)} width={Math.max(0.8, pas / series.length - 0.4)} height={Math.max(0, H - B - y(v))} />,
            ),
          )}
        {forme !== "barres" &&
          series.map((s) =>
            trace(s).map((d, k) => (
              <g key={`${s.nom}-${k}`}>
                {forme === "aires" && <path className={s.teinte === 0 ? styles.aireOr : styles.aireEncre} d={`${d} L${d.split("L").pop()!.split(",")[0]},${H - B} L${d.slice(1).split(",")[0]},${H - B} Z`} />}
                <path className={`${styles.trait} ${s.teinte === 0 ? styles.traitOr : styles.traitEncre}`} d={d} fill="none" />
              </g>
            )),
          )}
        {touche != null && <line className={styles.curseur} x1={x(touche)} x2={x(touche)} y1={TOP} y2={H - B} />}
        <text className={styles.repere} x={G} y={H - 6} textAnchor="start">
          {fmtDate(jours[0], true)}
        </text>
        <text className={styles.repere} x={L - D} y={H - 6} textAnchor="end">
          {fmtDate(jours[n - 1], true)}
        </text>
      </svg>
      <figcaption className={styles.legende}>
        {series.map((s) => (
          <span key={s.nom}>
            <i className={s.teinte === 0 ? styles.puceOr : styles.puceEncre} aria-hidden="true" />
            {t(s.nom)}
          </span>
        ))}
        <span className={styles.lecture} aria-live="polite">
          {touche != null && lecture ? `${fmtDate(jours[touche], true)} · ${lecture}` : ""}
        </span>
      </figcaption>
    </figure>
  );
}
