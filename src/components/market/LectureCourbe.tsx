"use client";

import { useT } from "@/i18n/client";
import styles from "./LectureCourbe.module.css";

/**
 * Ce que vous regardez, et ce qu'on peut en conclure.
 *
 * Trois réglages commandent cette figure, et chacun change ce que le chiffre
 * veut dire. Le desk les manipule sans que rien ne dise ce qu'il vient de
 * faire : élargir la profondeur peuple la courbe, et ce faisant y mélange des
 * époques ; reculer la date d'observation donne une courbe vraie d'un moment,
 * mais peuplée de titres remboursés depuis ; choisir la zone consolide des
 * signatures qui ne valent pas la même chose.
 *
 * Ce bloc n'est pas une aide en ligne, c'est une lecture : il compte ce qui est
 * réellement à l'écran, à cet instant, et n'énonce que ce que ce compte permet.
 * Une phrase générale sur « la prudence à avoir » ne vaut rien ; « quinze de
 * vos vingt points sont antérieurs à cette date » se vérifie.
 */

export interface PointLu {
  annees: number;
  mot: string;
  age: number;
  on?: string;
  echue?: boolean;
  mince?: boolean;
}

export function LectureCourbe({
  points,
  fenetreMot,
  observeLe,
  vue,
  zone,
}: {
  points: PointLu[];
  /** Le nom de la profondeur choisie : « 3 mois », « 5 ans ». */
  fenetreMot: string;
  /** La date d'observation, quand ce n'est pas aujourd'hui. */
  observeLe?: string;
  /** Le nom de ce qu'on regarde : « Tous », « CEMAC », ou un Trésor. */
  vue: string;
  /** Vrai quand la vue consolidée est affichée. */
  zone?: boolean;
}) {
  const t = useT();
  if (!points.length) return null;

  const horizons = new Set(points.map((p) => p.mot));
  const annees = points.map((p) => p.annees);
  const court = Math.min(...annees);
  const long = Math.max(...annees);
  const ages = [...points.map((p) => p.age)].sort((a, b) => a - b);
  const median = ages[Math.floor(ages.length / 2)];
  const vieux = ages[ages.length - 1];
  const echues = points.filter((p) => p.echue).length;
  const minces = points.filter((p) => p.mince).length;
  /** Le plus grand empilement : plusieurs séances posées sur un même horizon. */
  const parMot = new Map<string, number>();
  for (const p of points) parMot.set(p.mot, (parMot.get(p.mot) ?? 0) + 1);
  const empile = [...parMot.entries()].sort((a, b) => b[1] - a[1])[0];

  /**
   * Le verdict, sur les seuils usuels de l'ajustement de courbe.
   *
   * Quatre paramètres, ceux de Nelson-Siegel, demandent au moins six horizons
   * distincts pour être identifiés et huit pour être stables. En dessous, la
   * figure reste une observation : elle dit ce qui s'est payé, elle ne dit pas
   * le coût de l'argent à une durée qu'aucune séance n'a touchée.
   */
  const n = horizons.size;
  const portee =
    n >= 8
      ? t("assez d'horizons distincts pour porter une courbe ajustée")
      : n >= 6
        ? t("juste assez d'horizons pour une courbe ajustée contrainte")
        : n >= 3
          ? t("de quoi dessiner une pente, pas une courbure")
          : t("une observation, pas une courbe");

  return (
    <div className={styles.lecture}>
      <h3>{t("Ce que vous regardez")}</h3>
      <ul>
        <li>
          {t("{v} · {n} séances relues posées sur {h} durées distinctes, du {c} au {l}.", {
            v: vue,
            n: points.length,
            h: n,
            c: mot(court, t),
            l: mot(long, t),
          })}{" "}
          <span className={styles.portee}>{portee}</span>
        </li>

        <li>
          {t("La profondeur retenue est {f} : la figure accepte toute séance de cette période, et une durée peut y recevoir plusieurs séances.", { f: fenetreMot })}
          {empile && empile[1] > 1 ? (
            <>
              {" "}
              <b>{t("{n} séances se posent sur la seule durée « {h} »", { n: empile[1], h: empile[0] })}</b>
              {t(" : leur écart mesure le temps qui les sépare autant que le prix de cette durée.")}
            </>
          ) : null}
        </li>

        <li>
          {t("La séance la plus ancienne a {n} jours, la médiane {m} jours.", { n: vieux, m: median })}{" "}
          {vieux > 180
            ? t("Au delà de six mois, un point ne dit plus le coût de l'argent : il dit ce qu'il coûtait alors. Les points pâlissent avec l'âge pour cette raison.")
            : t("L'ensemble tient dans un semestre : les points se comparent entre eux.")}
        </li>

        {echues > 0 && (
          <li>
            {t("{n} des {t} lignes tracées étaient déjà remboursées à la date d'observation.", { n: echues, t: points.length })}{" "}
            {t("L'abscisse est la vie restante au jour de la séance, et non au jour d'observation : ces points disent ce qu'une durée a coûté, pas ce qu'un titre vivant rapporte aujourd'hui.")}
          </li>
        )}

        {minces > 0 && (
          <li>
            {t("{n} séance(s) mince(s), marquées d'un point creux.", { n: minces })}{" "}
            {t("Servies à un ou deux soumissionnaires, ou sans preneur pour tout le montant annoncé : le chiffre est vrai, il n'est pas représentatif.")}
          </li>
        )}

        {zone && (
          <li>
            {t("La vue de zone moyenne les Trésors présents à chaque horizon, et n'existe qu'aux horizons portés par deux signatures au moins.")}{" "}
            <b>{t("Ce n'est un taux auquel personne n'emprunte")}</b>
            {t(" : à deux ans et au delà, deux Trésors de la zone se sont payés jusqu'à 372 points de base d'écart.")}
          </li>
        )}

        {observeLe && (
          <li>
            {t("Vous regardez la courbe telle qu'elle était au {d}, et la courbe d'aujourd'hui est tracée en filigrane derrière.", { d: observeLe })}{" "}
            {t("Sans ce repère, un niveau passé ne se juge pas : dix pour cent à trois ans en 2023 n'est ni cher ni bon marché tant qu'on ignore ce que c'est aujourd'hui.")}
          </li>
        )}
      </ul>
    </div>
  );
}

/** L'abscisse mise en mots, avec le singulier au singulier. */
function mot(annees: number, t: ReturnType<typeof useT>): string {
  if (annees < 1) {
    const n = Math.max(1, Math.round(annees * 12));
    return n === 1 ? t("1 mois") : t("{n} mois", { n });
  }
  const n = Math.round(annees * 10) / 10;
  return n === 1 ? t("1 an") : t("{n} ans", { n });
}
