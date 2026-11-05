"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { daysBetween, rendementAnnualisePct } from "@/lib/finance";
import { fmt } from "@/lib/format";
import { lirePeriode, PERIODES, type PeriodeCours } from "@/lib/market/periodes";
import { ticksPropres } from "@/lib/ui/axes";
import { BulleNoire, useLecture, type Lecture } from "./charts/lecture";
import { invested, REF_AMOUNT, rollingAnnualised } from "./FundCharts";
import type { NavPoint } from "./NavChart";
import { Majeur, Tuiles } from "./Mosaique";
import { PastilleVariation } from "./PastilleVariation";
import { Select } from "./ui/Select";
import styles from "./CourbeDuCours.module.css";

/**
 * LA COURBE D'UN FONDS : UNE COURBE, TROIS MESURES, UNE LISTE DE PÉRIODES (fiche d'un fonds, 10 novembre 2026, planche « 1A · 2B · 3A · 4A »).
 *
 * Un commutateur à plat choisit ce que la courbe mesure : la valeur liquidative, le rendement annualisé ou ce que vaudraient
 * 1 000 000 FCFA placés au début de la période. Une seule liste, la même que celle d'une action (3 mois à Max), règle les trois : la courbe, la variation écrite
 * à côté et les tuiles du dessous. Une période que la série ne couvre pas est dans la liste, grisée. Les dates libres ne sont plus : la liste les remplace.
 * Au toucher (ou au glissement), une bulle noire au-dessus du tracé dit la VL. Les dates de l'axe portent toujours l'année. Les performances passées ne sont pas
 * garanties : la mention reste écrite sous les chiffres, pas seulement dans une bulle.
 */
type Mesure = "vl" | "rendement" | "placement";
const MESURES: [Mesure, string][] = [
  ["vl", "Valeur"],
  ["rendement", "Rendement"],
  ["placement", "1 M placés"],
];
/** Les fenêtres de calcul du rendement glissant, de la plus longue à la plus courte ; il faut de la place devant la série. */
const FENETRES = [365, 183, 92];
/** L'historique qu'il faut pour tracer le rendement glissant de la plus courte fenêtre : elle plus 20 % de marge devant la série. */
const JOURS_MINI = Math.ceil(FENETRES[FENETRES.length - 1] * 1.2);
const signe = (v: number, d = 2) => `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

export function CourbeDeLaVL({ series, hauteur = 190 }: { series: NavPoint[]; hauteur?: number }) {
  const t = useT();
  const { fmtDate } = useDates();
  const points = series.map((p) => ({ d: p.date, c: p.nav, v: 0 }));
  const lectures = PERIODES.map((p) => lirePeriode(points, p.cle));
  const [periode, setPeriode] = useState<PeriodeCours>(() => (lirePeriode(points, "1a").disponible ? "1a" : "max"));
  const [mesure, setMesure] = useState<Mesure>("vl");
  const lue = lectures.find((l) => l.cle === periode && l.disponible) ?? lectures.find((l) => l.cle === "max") ?? lectures[0];
  const debut = lue.serie[0]?.d ?? series[0]?.date;
  const fenetre = series.length > 1 ? FENETRES.find((j) => daysBetween(series[0].date, series[series.length - 1].date) >= j * 1.2) : undefined;
  const glissant = fenetre ? rollingAnnualised(series, fenetre) : [];
  const rendementPossible = glissant.length >= 2;
  const joursDHistorique = series.length > 1 ? daysBetween(series[0].date, series[series.length - 1].date) : 0;
  const fenetreNav = series.filter((p) => p.date >= debut);
  /* UN FONDS JEUNE (« rendementPossible » faux) : « Rendement » montre l'écart avec la première VL de la période, NON ANNUALISÉ (10 novembre 2026) : annualiser deux mois extrapolerait. */
  const cumule = mesure === "rendement" && !rendementPossible;
  const tracee: { d: string; y: number; nav: number }[] =
    mesure === "rendement" && rendementPossible
      ? glissant.filter((p) => p.date >= debut).map((p) => ({ d: p.date, y: p.y, nav: p.nav }))
      : cumule
        ? fenetreNav.map((p) => ({ d: p.date, y: fenetreNav[0].nav > 0 ? (p.nav / fenetreNav[0].nav - 1) * 100 : 0, nav: p.nav }))
      : mesure === "placement"
        ? invested(fenetreNav).map((p) => ({ d: p.date, y: p.y, nav: p.nav }))
        : fenetreNav.map((p) => ({ d: p.date, y: p.nav, nav: p.nav }));
  const mesureLue: Mesure = mesure;
  const W = 320;
  const gauche = 46;
  const droite = 8;
  const H = hauteur;
  const bas0 = H - 22;
  const n = tracee.length;
  const x = (i: number) => gauche + (i * (W - gauche - droite)) / Math.max(1, n - 1);
  const { handlers, index } = useLecture(n, x, W);
  if (series.length === 0 || n < 2) return null;
  const premier = tracee[0];
  const dernier = tracee[n - 1];
  const toutes = [...tracee.map((p) => p.y), ...(mesureLue === "rendement" ? [0] : [])];
  const ticks = ticksPropres(Math.min(...toutes), Math.max(...toutes), 3);
  const bas = ticks[0];
  const haut = ticks[ticks.length - 1];
  const y = (v: number) => 18 + (haut === bas ? (bas0 - 18) / 2 : (1 - (v - bas) / (haut - bas)) * (bas0 - 18));
  const fmtY = (v: number) => (mesureLue === "rendement" ? `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : fmt(v));
  const trait = tracee.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");
  const aire = `${trait} L${x(n - 1).toFixed(1)} ${bas0} L${x(0).toFixed(1)} ${bas0} Z`;
  const dates = [0, Math.floor((n - 1) / 2), n - 1];
  const nom = mesureLue === "vl" ? t("Valeur liquidative") : mesureLue === "rendement" ? (cumule ? t("Rendement depuis la première VL") : t("Rendement annualisé")) : t("{n} FCFA placés", { n: fmt(REF_AMOUNT) });
  const lecture: Lecture | null =
    index == null || !tracee[index]
      ? null
      : {
          titre: fmtDate(tracee[index].d),
          lignes: [
            { nom, valeur: mesureLue === "vl" ? `${fmt(tracee[index].y)} FCFA` : mesureLue === "rendement" ? signe(tracee[index].y) : `${fmt(tracee[index].y)} FCFA`, couleur: "var(--gold)" },
            ...(mesureLue !== "vl" ? [{ nom: t("VL"), valeur: `${fmt(tracee[index].nav)} FCFA`, couleur: "var(--ink-3)" }] : []),
          ],
        };
  /* LES TUILES DE LA PÉRIODE : calculées sur les VL publiées dans la fenêtre, brutes, avant droits d'entrée et de sortie et fiscalité. */
  const f = fenetreNav[0];
  const l = fenetreNav[fenetreNav.length - 1];
  const jours = f && l ? daysBetween(f.date, l.date) : 0;
  const annualisee = f && l ? rendementAnnualisePct(f.nav, l.nav, jours) : null;
  const haute = fenetreNav.reduce((m, p) => Math.max(m, p.nav), 0);
  const basse = fenetreNav.reduce((m, p) => Math.min(m, p.nav), Infinity);
  const baisses = fenetreNav.slice(1).filter((p, i) => p.nav < fenetreNav[i].nav).length;

  /* L'EN-TÊTE SUIT LA MESURE (10 novembre 2026, planche 1A) : le chiffre du haut dit ce que la courbe montre, VL, rendement du dernier point ou valeur du montant placé. Une ligne « sous » dans les trois états, réservée en hauteur : changer de mesure ne déplace rien. */
  const derniereVL = series[series.length - 1];
  const variationDuPlace = ((dernier.y / REF_AMOUNT) - 1) * 100;
  const entete =
    mesureLue === "vl" ? (
      <Majeur etiquette={t("Dernière VL · {d}", { d: fmtDate(derniereVL.date) })} valeur={fmt(derniereVL.nav)} unite="FCFA" sous={derniereVL.variationPct != null ? <PastilleVariation v={derniereVL.variationPct} periode={t("dernière VL")} /> : <span>{fmtDate(derniereVL.date)}</span>} />
    ) : mesureLue === "rendement" ? (
      cumule ? (
        <Majeur etiquette={t("Rendement depuis le {d} · non annualisé", { d: fmtDate(premier.d) })} valeur={signe(dernier.y)} sous={<span>{fmtDate(dernier.d)}</span>} />
      ) : (
        <Majeur etiquette={t("Rendement annualisé · {n} jours glissants", { n: fenetre ?? 365 })} valeur={signe(dernier.y)} sous={<span>{fmtDate(dernier.d)}</span>} />
      )
    ) : (
      <Majeur etiquette={t("{n} FCFA placés le {d}", { n: fmt(REF_AMOUNT), d: fmtDate(premier.d) })} valeur={fmt(dernier.y)} unite="FCFA" sous={<PastilleVariation v={variationDuPlace} periode={t(lue.libelle)} />} />
    );

  return (
    <div className={styles.bloc}>
      <div className={styles.enteteMesure}>{entete}</div>
      <div className={styles.commutateur} role="group" aria-label={t("Ce que la courbe mesure")}>
        {MESURES.map(([m, libelle]) => (
          <button key={m} type="button" aria-pressed={mesureLue === m} className={mesureLue === m ? styles.actif : undefined} onClick={() => setMesure(m)}>
            {t(libelle)}
          </button>
        ))}
      </div>
      {/* UN FONDS JEUNE (FCP CCA Invest : 63 jours) n'a pas assez d'historique pour un rendement glissant : la mesure « Rendement » montre alors l'écart depuis la première VL, non annualisé, et la ligne le dit. */}
      {!rendementPossible && <p className={styles.indisponible}>{t("Fonds de {n} jours : le rendement glissant demande {mini} jours d'historique, « Rendement » montre l'écart depuis la première VL, non annualisé.", { mini: JOURS_MINI, n: joursDHistorique })}</p>}
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
          options={lectures.map((p) => ({
            value: p.cle,
            label: t(p.libelle),
            disabled: !p.disponible,
            hint: p.disponible ? (p.cle === "max" && p.depuis ? t("depuis le {d}", { d: fmtDate(p.depuis) }) : p.variationPct !== undefined ? signe(p.variationPct) : "—") : t("historique insuffisant"),
          }))}
        />
      </div>
      <div className={styles.zone}>
        <BulleNoire lecture={lecture} x={index == null ? 0 : x(index)} W={W} />
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.dessin} role="img" aria-label={`${nom} ${t("du {a} au {b}", { a: fmtDate(premier.d), b: fmtDate(dernier.d) })} : ${fmtY(premier.y)} → ${fmtY(dernier.y)}`} {...handlers}>
          <text x={2} y={9} className={styles.unite}>
            {mesureLue === "rendement" ? "%" : "FCFA"}
          </text>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={gauche} x2={W - droite} y1={y(v)} y2={y(v)} className={styles.grille} />
              <text x={gauche - 4} y={y(v) + 2.5} textAnchor="end" className={styles.graduation}>
                {fmtY(v)}
              </text>
            </g>
          ))}
          <path d={aire} className={styles.aire} />
          <path d={trait} className={styles.trait} />
          <circle cx={x(n - 1)} cy={y(dernier.y)} r={3.5} className={styles.point} />
          {dates.map((i, k) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} className={styles.graduation}>
              {fmtDate(tracee[i].d)}
            </text>
          ))}
          {index != null && tracee[index] && (
            <g>
              <line x1={x(index)} x2={x(index)} y1={14} y2={bas0} className={styles.curseur} />
              <circle cx={x(index)} cy={y(tracee[index].y)} r={4} className={styles.pointLu} />
            </g>
          )}
        </svg>
      </div>
      <p className={`${styles.legende} ${styles.legendeFixe}`}>
        {t(n > 1 ? "{n} VL publiées · du {a} au {b}" : "1 VL publiée · du {a} au {b}", { n, a: fmtDate(premier.d), b: fmtDate(dernier.d) })}
        {mesureLue === "rendement" && fenetre && !cumule ? <span className={styles.indice}>{t("les {n} jours qui précèdent chaque point", { n: fenetre })}</span> : null}
        {cumule ? <span className={styles.indice}>{t("écart avec la première VL de la période, brut, avant frais")}</span> : null}
        {mesureLue === "placement" ? <span className={styles.indice}>{t("placés à la première VL, brut, avant frais")}</span> : null}
      </p>
      <Tuiles
        tuiles={[
          [t("Performance sur la période"), lue.variationPct !== undefined ? signe(lue.variationPct) : "—"],
          [t("Annualisée sur la période"), annualisee == null ? "—" : signe(annualisee)],
          [t("Plus haut · plus bas"), `${fmt(haute)} · ${fmt(basse)}`],
          [t("VL en baisse"), `${baisses} ${t("sur")} ${Math.max(0, fenetreNav.length - 1)}`],
        ]}
      />
      <p className={styles.garde}>{t("Performances passées non garanties")} · {t("brutes, avant droits d'entrée et de sortie et fiscalité")}</p>
    </div>
  );
}
