"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import { lirePeriode, periodeParDefaut, PERIODES, volumetrie, type PeriodeCours, type PointCours } from "@/lib/market/periodes";
import { ticksPropres } from "@/lib/ui/axes";
import { PastilleVariation } from "./PastilleVariation";
import { Select } from "./ui/Select";
import { Tuiles } from "./Mosaique";
import styles from "./CourbeDuCours.module.css";

/**
 * LA COURBE DU COURS D'UNE ACTION, SES VOLUMES ET LEUR AXE (fiche, 9 novembre 2026, planche 1A « liste déroulante »).
 *
 * Une liste déroulante choisit la période (3 mois, 6 mois, 1 an, début d'année, 2 ans, 3 ans, 5 ans, max) ; elle règle d'un coup la courbe, la variation écrite
 * à côté et la volumétrie. UNE SEULE DÉFINITION de la variation (`lirePeriode`, la même que « Ce qui performe ») : la pastille et la courbe ne se contredisent pas.
 * Une période que l'historique ne couvre pas est dans la liste, grisée, avec sa raison : on ne prête pas de chiffre à « 5 ans » quand la série tient en un an.
 * Le prix a son axe à gauche (FCFA), les volumes leur panneau et leur axe dessous (titres), et trois chiffres disent les échanges de la période : sur ce marché
 * la plupart des séances n'ont aucun échange, et une courbe plate ne dit pas « stable » mais « pas d'échange ».
 */
export function CourbeDuCours({ points, hauteur = 190 }: { points: PointCours[]; hauteur?: number }) {
  const t = useT();
  const { fmtDate } = useDates();
  const [periode, setPeriode] = useState<PeriodeCours>(() => periodeParDefaut(points));
  if (points.length === 0) return null;
  const lectures = PERIODES.map((p) => lirePeriode(points, p.cle));
  const lue = lectures.find((l) => l.cle === periode && l.disponible) ?? lectures.find((l) => l.cle === "max")!;
  const serie = lue.serie.length >= 2 ? lue.serie : points.slice(-2);
  const signe = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

  const W = 320;
  const gauche = 46;
  const droite = 8;
  const H = hauteur;
  const prixH = Math.round(H * 0.58);
  const volTop = prixH + 24;
  const volBas = H - 22;
  const closes = serie.map((p) => p.c);
  const ticks = ticksPropres(Math.min(...closes), Math.max(...closes), 3);
  const bas = ticks[0];
  const haut = ticks[ticks.length - 1];
  const x = (i: number) => gauche + (i * (W - gauche - droite)) / Math.max(1, serie.length - 1);
  const y = (v: number) => 18 + (haut === bas ? (prixH - 18) / 2 : (1 - (v - bas) / (haut - bas)) * (prixH - 18));
  const trait = serie.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.c).toFixed(1)}`).join(" ");
  const aire = `${trait} L${x(serie.length - 1).toFixed(1)} ${prixH} L${x(0).toFixed(1)} ${prixH} Z`;
  const vol = volumetrie(serie);
  const vticks = vol.plusFort > 0 ? ticksPropres(0, vol.plusFort, 3) : [0];
  const vhaut = vticks[vticks.length - 1] || 1;
  const vy = (v: number) => volBas - (v / vhaut) * (volBas - volTop);
  const largeur = Math.max(1.4, Math.min(5, ((W - gauche - droite) / serie.length) * 0.6));
  const dates = [0, Math.floor((serie.length - 1) / 2), serie.length - 1];
  const dernier = serie[serie.length - 1];

  return (
    <div className={styles.bloc}>
      <div className={styles.entete}>
        <span className={styles.variation}>{lue.variationPct !== undefined && <PastilleVariation v={lue.variationPct} periode={t(lue.libelle)} />}</span>
        <Select
          compact
          cherchable={false}
          label={t("Période du graphe")}
          value={lue.cle}
          onChange={(v) => setPeriode(v as PeriodeCours)}
          options={lectures.map((l) => ({
            value: l.cle,
            label: t(l.libelle),
            disabled: !l.disponible,
            hint: l.disponible ? (l.cle === "max" && l.depuis ? t("depuis le {d}", { d: fmtDate(l.depuis) }) : l.variationPct !== undefined ? signe(l.variationPct) : "—") : t("historique insuffisant"),
          }))}
        />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.dessin} role="img" aria-label={`${t("Clôtures du {a} au {b}", { a: fmtDate(serie[0].d), b: fmtDate(dernier.d) })} : ${fmt(serie[0].c)} → ${fmt(dernier.c)} FCFA`}>
        <text x={2} y={9} className={styles.unite}>
          FCFA
        </text>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={gauche} x2={W - droite} y1={y(v)} y2={y(v)} className={styles.grille} />
            <text x={gauche - 4} y={y(v) + 2.5} textAnchor="end" className={styles.graduation}>
              {fmt(v)}
            </text>
          </g>
        ))}
        <path d={aire} className={styles.aire} />
        <path d={trait} className={styles.trait} />
        <circle cx={x(serie.length - 1)} cy={y(dernier.c)} r={3.5} className={styles.point} />
        <text x={2} y={volTop - 6} className={styles.unite}>
          {t("titres")}
        </text>
        {vticks.map((v) => (
          <g key={v}>
            <line x1={gauche} x2={W - droite} y1={vy(v)} y2={vy(v)} className={styles.grille} />
            <text x={gauche - 4} y={vy(v) + 2.5} textAnchor="end" className={styles.graduation}>
              {fmt(v)}
            </text>
          </g>
        ))}
        {serie.map((p, i) => (p.v > 0 ? <rect key={p.d} x={x(i) - largeur / 2} y={vy(p.v)} width={largeur} height={volBas - vy(p.v)} className={styles.volume} /> : null))}
        {dates.map((i, k) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} className={styles.graduation}>
            {fmtDate(serie[i].d, false)}
          </text>
        ))}
      </svg>
      <p className={styles.legende}>{t(serie.length > 1 ? "{n} séances · du {a} au {b}" : "1 séance · du {a} au {b}", { n: serie.length, a: fmtDate(serie[0].d), b: fmtDate(dernier.d) })}</p>
      <Tuiles tuiles={[[t("Volume échangé"), `${fmt(vol.total)} ${t("titres")}`], [t("Séances avec échange"), t("{n} sur {m} séances", { n: vol.seancesAvecEchange, m: vol.seances })], [t("Plus fort volume"), `${fmt(vol.plusFort)} ${t("titres")}`]]} />
    </div>
  );
}
