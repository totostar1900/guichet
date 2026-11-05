"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import styles from "./CourbeDuCours.module.css";

/**
 * LA COURBE DU COURS D'UNE ACTION, ET SES VOLUMES (fiche, 9 novembre 2026, planche « graphes »).
 *
 * Les clôtures de la cote en ligne, les volumes échangés en barres dessous (la plupart des séances de ce marché n'ont aucun échange : les barres le disent mieux
 * qu'une courbe plate). Trois périodes : un mois, trois mois, depuis l'introduction en bourse quand elle est connue. Aucune variation n'est écrite ici : celle du
 * titre vient d'une seule définition (`performanceSur`), et une seconde, d'un autre intervalle, se lirait comme une contradiction.
 */
export interface PointDeCours {
  /** AAAA-MM-JJ. */
  d: string;
  c: number;
  v: number;
}

const JOURS = { mois: 31, trimestre: 92 } as const;
type Periode = "mois" | "trimestre" | "tout";

const avant = (iso: string, jours: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - jours);
  return d.toISOString().slice(0, 10);
};

export function CourbeDuCours({ points, introduction, hauteur = 110 }: { points: PointDeCours[]; /** La date d'introduction (AAAA-MM-JJ) : fait de « tout » « depuis l'introduction ». */ introduction?: string; hauteur?: number }) {
  const t = useT();
  const { fmtDate } = useDates();
  const [periode, setPeriode] = useState<Periode>("trimestre");
  if (points.length === 0) return null;
  const dernier = points[points.length - 1].d;
  const depuis = periode === "tout" ? (introduction ?? points[0].d) : avant(dernier, JOURS[periode]);
  const vus = points.filter((p) => p.d >= depuis);
  const serie = vus.length >= 2 ? vus : points.slice(-2);
  const W = 320;
  const H = hauteur;
  const pad = 6;
  const bas = H - pad;
  const closes = serie.map((p) => p.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const x = (i: number) => pad + (serie.length === 1 ? (W - 2 * pad) / 2 : (i * (W - 2 * pad)) / (serie.length - 1));
  const zone = H * 0.74;
  const y = (v: number) => (max === min ? zone / 2 + pad : pad + (1 - (v - min) / (max - min)) * (zone - pad));
  const trait = serie.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.c).toFixed(1)}`).join(" ");
  const aire = `${trait} L${x(serie.length - 1).toFixed(1)} ${zone.toFixed(1)} L${x(0).toFixed(1)} ${zone.toFixed(1)} Z`;
  const vmax = Math.max(1, ...serie.map((p) => p.v));
  const largeur = Math.max(1.5, Math.min(6, ((W - 2 * pad) / serie.length) * 0.6));
  const options: [Periode, string][] = [
    ["mois", t("1 mois")],
    ["trimestre", t("3 mois")],
    ["tout", t(introduction ? "Depuis l'introduction" : "Tout")],
  ];
  const premier = serie[0];
  const dernierP = serie[serie.length - 1];
  return (
    <div className={styles.bloc}>
      <div className={styles.periodes} role="group" aria-label={t("Période du graphe")}>
        {options.map(([cle, libelle]) => (
          <button key={cle} type="button" aria-pressed={periode === cle} className={periode === cle ? styles.on : undefined} onClick={() => setPeriode(cle)}>
            {libelle}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.dessin} role="img" aria-label={`${t("Clôtures du {a} au {b}", { a: fmtDate(premier.d), b: fmtDate(dernierP.d) })} : ${fmt(premier.c)} → ${fmt(dernierP.c)} FCFA`}>
        <path d={aire} className={styles.aire} />
        <path d={trait} className={styles.trait} />
        {serie.map((p, i) =>
          p.v > 0 ? <rect key={p.d} x={x(i) - largeur / 2} y={bas - (p.v / vmax) * (H - zone - 2 * pad)} width={largeur} height={(p.v / vmax) * (H - zone - 2 * pad)} className={styles.volume} /> : null,
        )}
        <circle cx={x(serie.length - 1)} cy={y(dernierP.c)} r={3.5} className={styles.point} />
        <text x={pad} y={pad + 8} className={styles.borne}>
          {fmt(max)}
        </text>
        {max !== min && (
          <text x={pad} y={zone - 2} className={styles.borne}>
            {fmt(min)}
          </text>
        )}
      </svg>
      <p className={styles.legende}>{t(serie.length > 1 ? "{n} séances · du {a} au {b} · volumes en bas" : "1 séance · du {a} au {b}", { n: serie.length, a: fmtDate(premier.d), b: fmtDate(dernierP.d) })}</p>
    </div>
  );
}
