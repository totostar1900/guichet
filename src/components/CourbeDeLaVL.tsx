"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { daysBetween, rendementAnnualisePct } from "@/lib/finance";
import { fmt } from "@/lib/format";
import { fundCurveFrom } from "@/lib/domain/fund-curve";
import { CLE_DE_PERIODE, classer, type Comparaison, ligneDeComparaison, rangEcrit } from "@/lib/market/comparatif";
import { lirePeriode, PERIODES, type PeriodeCours } from "@/lib/market/periodes";
import { ticksPropres } from "@/lib/ui/axes";
import { BulleNoire, useLecture, type Lecture } from "./charts/lecture";
import { invested, REF_AMOUNT, rollingAnnualised } from "./FundCharts";
import type { NavPoint } from "./NavChart";
import { BarresDeRang } from "./BarresDeRang";
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
type Mesure = "vl" | "rendement" | "placement" | "comparatif";
const MESURES: [Mesure, string][] = [
  ["vl", "Valeur"],
  ["rendement", "Rendement"],
  ["placement", "1 M placés"],
];
const COMPARATIF: [Mesure, string] = ["comparatif", "Comparatif"];
/** Les fenêtres de calcul du rendement glissant, de la plus longue à la plus courte ; il faut de la place devant la série. */
const FENETRES = [365, 183, 92];
/** L'historique qu'il faut pour tracer le rendement glissant de la plus courte fenêtre : elle plus 20 % de marge devant la série. */
const JOURS_MINI = Math.ceil(FENETRES[FENETRES.length - 1] * 1.2);
const signe = (v: number, d = 2) => `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

export function CourbeDeLaVL({ series, comparaison, hauteur = 190 }: { series: NavPoint[]; /** Les pairs de la même catégorie, classés sur la liste des fonds : sans eux, pas d'onglet « Comparatif ». */ comparaison?: Comparaison; hauteur?: number }) {
  const t = useT();
  const { fmtDate } = useDates();
  const points = series.map((p) => ({ d: p.date, c: p.nav, v: 0 }));
  const lectures = PERIODES.map((p) => lirePeriode(points, p.cle));
  const [periode, setPeriode] = useState<PeriodeCours>(() => (lirePeriode(points, "1a").disponible ? "1a" : "max"));
  const [mesure, setMesure] = useState<Mesure>("vl");
  const [choisi, setChoisi] = useState<string | undefined>(undefined);
  const lue = lectures.find((l) => l.cle === periode && l.disponible) ?? lectures.find((l) => l.cle === "max") ?? lectures[0];
  /* UNE SEULE DÉFINITION DE LA PERFORMANCE D'UN FONDS SUR UNE PÉRIODE (11 novembre 2026) : celle de la LISTE DES FONDS (« fenetresDe » : la dernière VL publiée AVANT la date visée ; l'année en cours : la dernière VL avant le 1er janvier). La carte la calcule sur la même série avec la même fonction : la pastille, les tuiles, la courbe, « 1 M placés » et le classement du comparatif disent le même chiffre. Pour 5 ans et Max, que la liste ne mesure pas, la période garde sa définition propre. */
  const moiLigne = ligneDeComparaison("moi", "", fundCurveFrom(series.map((p) => ({ navDate: p.date, nav: p.nav }))));
  const mesureDe = (cle: PeriodeCours) => {
    const c = CLE_DE_PERIODE[cle];
    return c ? moiLigne.pcts[c] : undefined;
  };
  const mesureListe = mesureDe(lue.cle);
  const perfPeriode = mesureListe?.pct ?? lue.variationPct;
  const debut = mesureListe?.depuis ?? lue.serie[0]?.d ?? series[0]?.date;
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
  /* LE COMPARATIF (11 novembre 2026, planche option A) : la courbe est remplacée par le classement des pairs ; le reste de la carte (liste de période, tuiles, mise en garde) ne bouge pas. */
  const comparatif = mesure === "comparatif" && Boolean(comparaison);
  /* LA PÉRIODE DU COMPARATIF est la plus longue que la LISTE mesure pour ce fonds (un fonds de trois mois n'a ni 1 an ni 6 mois) ; sans aucune, rien à comparer. */
  const periodeComparable = (["1a", "debut", "6m", "3m", "2a", "3a"] as PeriodeCours[]).find((k) => mesureDe(k));
  const aUnePeriodeComparable = periodeComparable !== undefined;
  const cleComparee = CLE_DE_PERIODE[lue.cle];
  const mesureLue: Mesure = comparatif ? "vl" : mesure;
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
  const rang = comparatif && comparaison && cleComparee ? classer(comparaison.moi, comparaison.pairs, cleComparee) : undefined;
  const entete = comparatif ? (
    rang && comparaison ? (
      rang.rang != null ? (
        <Majeur
          etiquette={t("Rang sur {n} fonds · {p}", { n: rang.total, p: t(lue.libelle) })}
          valeur={rangEcrit(rang.rang)}
          sous={<span>{rang.premier ? t("Le premier de la catégorie fait {v}", { v: signe(rang.premier.pct) }) : t("En tête de sa catégorie sur la période")}</span>}
        />
      ) : (
        <Majeur etiquette={t("Rang · {p}", { p: t(lue.libelle) })} valeur="—" sous={<span>{t("Pas assez d'historique sur cette période.")}</span>} />
      )
    ) : (
      <Majeur etiquette={t("Comparatif")} valeur="—" sous={<span>{aUnePeriodeComparable ? t("Cette période ne se compare pas entre fonds.") : t("Pas assez d'historique pour comparer ce fonds.")}</span>} />
    )
  ) :
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
      <div className={`${styles.commutateur} ${comparaison ? styles.quatre : ""}`} role="group" aria-label={t("Ce que la courbe mesure")}>
        {(comparaison ? [...MESURES, COMPARATIF] : MESURES).map(([m, libelle]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mesure === m}
            className={mesure === m ? styles.actif : undefined}
            onClick={() => {
              setMesure(m);
              if (m === "comparatif" && !mesureDe(lue.cle) && periodeComparable) setPeriode(periodeComparable);
            }}
          >
            {t(libelle)}
          </button>
        ))}
      </div>
      {/* UN FONDS JEUNE (FCP CCA Invest : 63 jours) n'a pas assez d'historique pour un rendement glissant : la mesure « Rendement » montre alors l'écart depuis la première VL, non annualisé, et la ligne le dit. */}
      {!rendementPossible && <p className={styles.indisponible}>{t("Fonds de {n} jours : le rendement glissant demande {mini} jours d'historique, « Rendement » montre l'écart depuis la première VL, non annualisé.", { mini: JOURS_MINI, n: joursDHistorique })}</p>}
      <div className={styles.entete}>
        <span className={styles.variation}>{perfPeriode !== undefined && <PastilleVariation v={perfPeriode} periode={t(lue.libelle)} />}</span>
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
            disabled: !p.disponible || (comparatif && !CLE_DE_PERIODE[p.cle]),
            hint: comparatif && p.disponible && !CLE_DE_PERIODE[p.cle] ? t("non comparable entre fonds") : p.disponible ? (p.cle === "max" && p.depuis ? t("depuis le {d}", { d: fmtDate(p.depuis) }) : (mesureDe(p.cle)?.pct ?? p.variationPct) !== undefined ? signe((mesureDe(p.cle)?.pct ?? p.variationPct) as number) : "—") : t("historique insuffisant"),
          }))}
        />
      </div>
      {comparatif && comparaison ? (
        rang && rang.lignes.length > 0 ? (
          <BarresDeRang lignes={rang.lignes} choisi={choisi} onChoisir={setChoisi} idDuFonds={comparaison.moi.id} titreDuFonds={comparaison.moi.titre} depuisLe={(d) => fmtDate(d)} />
        ) : (
          <p className={styles.zoneVide}>{aUnePeriodeComparable ? t("Aucun fonds de la catégorie n'a de mesure sur cette période.") : t("Pas encore trois mois d'historique : rien à comparer.")}</p>
        )
      ) : (
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
      )}
      <p className={`${styles.legende} ${styles.legendeFixe}`}>
        {comparatif && comparaison && rang ? (
          <>
            {rang.sans > 0 ? t("{n} fonds comparés · {k} sans historique", { n: rang.total, k: rang.sans }) : t("{n} fonds comparés · {c}", { n: rang.total, c: t(comparaison.categorie) })}
            <span className={styles.indice}>{t("mêmes chiffres que la liste des fonds")}</span>
          </>
        ) : (
          <>
            {t(n > 1 ? "{n} VL publiées · du {a} au {b}" : "1 VL publiée · du {a} au {b}", { n, a: fmtDate(premier.d), b: fmtDate(dernier.d) })}
            {mesureLue === "rendement" && fenetre && !cumule ? <span className={styles.indice}>{t("les {n} jours qui précèdent chaque point", { n: fenetre })}</span> : null}
            {cumule ? <span className={styles.indice}>{t("écart avec la première VL de la période, brut, avant frais")}</span> : null}
            {mesureLue === "placement" ? <span className={styles.indice}>{t("placés à la première VL, brut, avant frais")}</span> : null}
          </>
        )}
      </p>
      <Tuiles
        tuiles={[
          [t("Performance sur la période"), perfPeriode !== undefined ? signe(perfPeriode) : "—"],
          [t("Annualisée sur la période"), annualisee == null ? "—" : signe(annualisee)],
          [t("Plus haut · plus bas"), `${fmt(haute)} · ${fmt(basse)}`],
          [t("VL en baisse"), `${baisses} ${t("sur")} ${Math.max(0, fenetreNav.length - 1)}`],
        ]}
      />
      <p className={styles.garde}>{t("Performances passées non garanties")} · {t("brutes, avant droits d'entrée et de sortie et fiscalité")}</p>
    </div>
  );
}
