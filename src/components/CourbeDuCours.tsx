"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmt, fmtScaled, pickScale } from "@/lib/format";
import { lirePeriode, periodeParDefaut, PERIODES, volumetrie, type PeriodeCours, type PointCours } from "@/lib/market/periodes";
import { ticksPropres } from "@/lib/ui/axes";
import { BulleNoire, useLecture, type Lecture } from "./charts/lecture";
import { PastilleVariation } from "./PastilleVariation";
import { Tuiles } from "./Mosaique";
import { Select } from "./ui/Select";
import styles from "./CourbeDuCours.module.css";

/**
 * LA COURBE DU COURS D'UNE ACTION, SES VOLUMES ET LEUR AXE (fiche, 9 novembre 2026, planche 1A « liste déroulante »).
 *
 * Une liste déroulante choisit la période (3 mois, 6 mois, 1 an, début d'année, 2 ans, 3 ans, 5 ans, max) ; elle règle d'un coup la courbe, la variation écrite
 * à côté et la volumétrie. UNE SEULE DÉFINITION de la variation (`lirePeriode`, la même que « Ce qui performe ») : la pastille et la courbe ne se contredisent pas.
 * Une période que l'historique ne couvre pas est dans la liste, grisée, avec sa raison : on ne prête pas de chiffre à « 5 ans » quand la série tient en un an.
 * Trois panneaux, chacun son axe : le prix (FCFA), les titres échangés, puis le VOLUME DES TRANSACTIONS (la valeur échangée, en FCFA). Sur ce marché la plupart des
 * séances n'ont aucun échange, et une courbe plate ne dit pas « stable » mais « pas d'échange ». Les dates de l'axe portent TOUJOURS l'année.
 * Au toucher (ou au glissement du doigt), une bulle noire au-dessus du dessin dit la séance : clôture, titres, valeur.
 */
export function CourbeDuCours({ points, hauteur = 258 }: { points: PointCours[]; hauteur?: number }) {
  const t = useT();
  const { fmtDate } = useDates();
  const [periode, setPeriode] = useState<PeriodeCours>(() => periodeParDefaut(points));
  const lectures = PERIODES.map((p) => lirePeriode(points, p.cle));
  const lue = lectures.find((l) => l.cle === periode && l.disponible) ?? lectures.find((l) => l.cle === "max")!;
  const serie = lue.serie.length >= 2 ? lue.serie : points.slice(-2);
  const W = 320;
  const gauche = 46;
  const droite = 8;
  const H = hauteur;
  const prixH = Math.round(H * 0.42);
  const volTop = prixH + 26;
  const volBas = volTop + Math.round(H * 0.15);
  const valTop = volBas + 26;
  const valBas = H - 22;
  const x = (i: number) => gauche + (i * (W - gauche - droite)) / Math.max(1, serie.length - 1);
  const { handlers, index } = useLecture(serie.length, x, W);
  if (points.length === 0) return null;
  const signe = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  const closes = serie.map((p) => p.c);
  const ticks = ticksPropres(Math.min(...closes), Math.max(...closes), 3);
  const bas = ticks[0];
  const haut = ticks[ticks.length - 1];
  const y = (v: number) => 18 + (haut === bas ? (prixH - 18) / 2 : (1 - (v - bas) / (haut - bas)) * (prixH - 18));
  const trait = serie.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.c).toFixed(1)}`).join(" ");
  const aire = `${trait} L${x(serie.length - 1).toFixed(1)} ${prixH} L${x(0).toFixed(1)} ${prixH} Z`;
  const vol = volumetrie(serie);
  const vticks = vol.plusFort > 0 ? ticksPropres(0, vol.plusFort, 3) : [0];
  const vhaut = vticks[vticks.length - 1] || 1;
  const vy = (v: number) => volBas - (v / vhaut) * (volBas - volTop);
  const valeurs = serie.map((p) => p.val ?? 0);
  const echelle = pickScale(valeurs);
  const aEchange = valeurs.some((v) => v > 0);
  const gticks = aEchange ? ticksPropres(0, Math.max(...valeurs) / echelle.div, 3) : [0];
  const ghaut = gticks[gticks.length - 1] || 1;
  const gy = (v: number) => valBas - (v / echelle.div / ghaut) * (valBas - valTop);
  const largeur = Math.max(1.4, Math.min(5, ((W - gauche - droite) / serie.length) * 0.6));
  const dates = [0, Math.floor((serie.length - 1) / 2), serie.length - 1];
  const dernier = serie[serie.length - 1];
  const lecture: Lecture | null =
    index == null || !serie[index]
      ? null
      : {
          titre: fmtDate(serie[index].d),
          lignes: [
            { nom: t("Clôture"), valeur: `${fmt(serie[index].c)} FCFA`, couleur: "var(--gold)" },
            { nom: t("Titres échangés"), valeur: fmt(serie[index].v), couleur: "var(--ink-3)" },
            { nom: t("Valeur échangée"), valeur: `${fmt(serie[index].val ?? 0)} FCFA`, couleur: "var(--ink-3)" },
          ],
        };

  return (
    <div className={styles.bloc}>
      <div className={styles.entete}>
        <span className={styles.variation}>{lue.variationPct !== undefined && <PastilleVariation v={lue.variationPct} periode={t(lue.libelle)} />}</span>
        <Select
          compact
          block
          className={styles.choix}
          libelleVisible={false}
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
      <div className={styles.zone}>
        <BulleNoire lecture={lecture} x={index == null ? 0 : x(index)} W={W} />
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.dessin} role="img" aria-label={`${t("Clôtures du {a} au {b}", { a: fmtDate(serie[0].d), b: fmtDate(dernier.d) })} : ${fmt(serie[0].c)} → ${fmt(dernier.c)} FCFA`} {...handlers}>
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
          <text x={2} y={volTop - 8} className={styles.unite}>
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
          <text x={2} y={valTop - 8} className={styles.unite}>
            {t("Valeur échangée")} · {aEchange ? echelle.short : "FCFA"}
          </text>
          {gticks.map((v) => (
            <g key={v}>
              <line x1={gauche} x2={W - droite} y1={valBas - (v / ghaut) * (valBas - valTop)} y2={valBas - (v / ghaut) * (valBas - valTop)} className={styles.grille} />
              <text x={gauche - 4} y={valBas - (v / ghaut) * (valBas - valTop) + 2.5} textAnchor="end" className={styles.graduation}>
                {v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
              </text>
            </g>
          ))}
          {serie.map((p, i) => ((p.val ?? 0) > 0 ? <rect key={`v${p.d}`} x={x(i) - largeur / 2} y={gy(p.val ?? 0)} width={largeur} height={valBas - gy(p.val ?? 0)} className={styles.valeur} /> : null))}
          {dates.map((i, k) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} className={styles.graduation}>
              {fmtDate(serie[i].d)}
            </text>
          ))}
          {index != null && serie[index] && (
            <g>
              <line x1={x(index)} x2={x(index)} y1={14} y2={valBas} className={styles.curseur} />
              <circle cx={x(index)} cy={y(serie[index].c)} r={4} className={styles.pointLu} />
            </g>
          )}
        </svg>
      </div>
      <p className={styles.legende}>{t(serie.length > 1 ? "{n} séances · du {a} au {b}" : "1 séance · du {a} au {b}", { n: serie.length, a: fmtDate(serie[0].d), b: fmtDate(dernier.d) })}</p>
      <Tuiles
        tuiles={[
          [t("Volume échangé"), `${fmt(vol.total)} ${t("titres")}`],
          [t("Valeur échangée"), `${fmtScaled(vol.valeur, echelle.div, echelle.div === 1 ? 0 : 1)} ${aEchange ? echelle.short : "FCFA"}`],
          [t("Séances avec échange"), t("{n} sur {m} séances", { n: vol.seancesAvecEchange, m: vol.seances })],
          [t("Plus fort volume"), `${fmt(vol.plusFort)} ${t("titres")}`],
        ]}
      />
    </div>
  );
}
