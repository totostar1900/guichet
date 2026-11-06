"use client";

import { useDates, useT } from "@/i18n/client";
import { ticksPropres } from "@/lib/ui/axes";
import { GRAPHE_H, GRAPHE_L } from "@/lib/ui/graphe";
import { BulleNoire, useLecture, type Lecture } from "./charts/lecture";
import styles from "./GrapheDeSerie.module.css";

/**
 * UN GRAPHE DE SÉRIE DANS LE TEMPS, À UN AXE (fiche d'une action, valorisation, 9 novembre 2026).
 *
 * Une ou deux courbes, l'axe des ordonnées gradué (de zéro : on ne coupe pas l'axe d'un rapport pour grossir un mouvement), l'unité écrite, trois dates en bas. `pas`
 * dessine en marches : un rapport tiré des comptes ne bouge qu'avec le cours et à chaque nouvel exercice, jamais entre deux séances. `marques` plante un trait
 * pointillé aux jours où l'exercice change. Une valeur absente coupe la courbe : jamais de zéro à sa place. Les dates de l'axe portent TOUJOURS l'année.
 * Au toucher ou au glissement du doigt, une bulle noire au-dessus du dessin dit la séance (date, valeur, exercice en vigueur).
 */
export interface SerieDuGraphe {
  nom: string;
  valeurs: (number | null)[];
  teinte: "or" | "bleu";
}

const nombre = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export function GrapheDeSerie({ dates, series, unite, pas = false, aire = false, marques = [], hauteur = GRAPHE_H, resume, exercices }: { dates: string[]; series: SerieDuGraphe[]; unite: string; pas?: boolean; aire?: boolean; marques?: { d: string; libelle: string }[]; hauteur?: number; resume: string; /** L'exercice qui compte à chaque séance (un rapport tiré des comptes) : dit dans la bulle. */ exercices?: (number | null)[] }) {
  const { fmtDate } = useDates();
  const t = useT();
  const W = GRAPHE_L;
  const gauche = 44;
  const droite = 8;
  const x = (i: number) => gauche + (i * (W - gauche - droite)) / Math.max(1, dates.length - 1);
  const { handlers, index } = useLecture(dates.length, x, W);
  if (dates.length < 2) return null;
  const H = hauteur;
  const haut = 26;
  const bas = H - 28;
  const valeurs = series.flatMap((s) => s.valeurs.filter((v): v is number => v != null));
  const ticks = ticksPropres(0, Math.max(...valeurs, 0.0001), 4);
  const max = ticks[ticks.length - 1];
  const y = (v: number) => bas - (v / max) * (bas - haut);
  const trace = (s: SerieDuGraphe) => {
    let d = "";
    s.valeurs.forEach((v, i) => {
      if (v == null) return;
      const prec = i > 0 ? s.valeurs[i - 1] : null;
      if (prec == null) d += `M${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      else d += pas ? `L${x(i).toFixed(1)} ${y(prec).toFixed(1)} L${x(i).toFixed(1)} ${y(v).toFixed(1)} ` : `L${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    });
    return d.trim();
  };
  const premier = series[0];
  const aireD = aire && premier.valeurs.every((v) => v != null) ? `${trace(premier)} L${x(dates.length - 1).toFixed(1)} ${bas} L${x(0).toFixed(1)} ${bas} Z` : "";
  const libres = [0, Math.floor((dates.length - 1) / 2), dates.length - 1];
  const lecture: Lecture | null =
    index == null || !dates[index]
      ? null
      : {
          titre: fmtDate(dates[index]),
          lignes: [
            ...series.map((s) => ({ nom: s.nom, valeur: s.valeurs[index] == null ? "—" : `${nombre(s.valeurs[index] as number)} ${unite}`, couleur: s.teinte === "bleu" ? "var(--navy-text)" : "var(--gold)" })),
            ...(exercices && exercices[index] != null ? [{ nom: t("Exercice en vigueur"), valeur: String(exercices[index]) }] : []),
          ],
        };
  return (
    <div className={styles.bloc}>
      <div className={styles.zone}>
      <BulleNoire lecture={lecture} x={index == null ? 0 : x(index)} W={W} />
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.dessin} role="img" aria-label={resume} {...handlers}>
        <text x={2} y={11} className={styles.unite}>
          {unite}
        </text>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={gauche} x2={W - droite} y1={y(v)} y2={y(v)} className={styles.grille} />
            <text x={gauche - 4} y={y(v) + 3.5} textAnchor="end" className={styles.graduation}>
              {nombre(v)}
            </text>
          </g>
        ))}
        {aireD && <path d={aireD} className={styles.aire} />}
        {series.map((s) => (
          <path key={s.nom} d={trace(s)} className={`${styles.trait} ${s.teinte === "bleu" ? styles.bleu : styles.or}`} />
        ))}
        {marques.map((m) => {
          const i = dates.findIndex((d) => d >= m.d);
          if (i < 0) return null;
          return (
            <g key={m.d}>
              <line x1={x(i)} x2={x(i)} y1={haut} y2={bas} className={styles.marque} />
              <text x={x(i) + 3} y={haut + 10} className={styles.graduation}>
                {m.libelle}
              </text>
            </g>
          );
        })}
        {libres.map((i, k) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} className={styles.graduation}>
            {fmtDate(dates[i])}
          </text>
        ))}
        {index != null && dates[index] && (
          <g>
            <line x1={x(index)} x2={x(index)} y1={haut} y2={bas} className={styles.curseur} />
            {series.map((s) => (s.valeurs[index] == null ? null : <circle key={s.nom} cx={x(index)} cy={y(s.valeurs[index] as number)} r={3.8} className={styles.pointLu} />))}
          </g>
        )}
      </svg>
      </div>
      {series.length > 1 && (
        <p className={styles.legende}>
          {series.map((s) => (
            <span key={s.nom}>
              <i className={s.teinte === "bleu" ? styles.fondBleu : styles.fondOr} />
              {s.nom}
            </span>
          ))}
        </p>
      )}
      <p className={styles.legende}>{t("{n} séances · du {a} au {b}", { n: dates.length, a: fmtDate(dates[0]), b: fmtDate(dates[dates.length - 1]) })}</p>
    </div>
  );
}
