"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import type { NiveauMarche } from "@/lib/market/niveau-marche";
import styles from "./FeuilleDuNiveau.module.css";

/**
 * LA FEUILLE QUI MONTRE, ET QUI RENVOIE.
 *
 * Le desk a besoin de voir sur quoi le niveau repose sans quitter sa file.
 * Une règle la tient : AUCUN RÉGLAGE DEDANS. Une feuille qui se règle devient
 * une seconde page de courbe, et deux pages qui font la même chose divergent
 * au premier changement, celle qu'on regarde le moins restant en arrière sans
 * prévenir.
 *
 * ELLE PASSE PAR LE `Sheet` PARTAGÉ, et la première version ne le faisait pas.
 * Écrite à la main, elle refaisait le voile, le glissement, Échap et le focus,
 * et oubliait ce qui ne se voit pas : le verrou de défilement et la retenue du
 * geste en bout de course. Trois garde-fous de la maison l'ont attrapée d'un
 * coup. Le défaut n'était pas dans le détail oublié, il était dans la décision
 * d'écrire une feuille de plus.
 *
 * Les trois liens de pied sont TOUJOURS LES MÊMES ET TOUJOURS À LA MÊME
 * PLACE : un lien qui se déplace d'une feuille à l'autre se cherche à chaque
 * fois.
 */
export function FeuilleDuNiveau({ niveau, pays, onFermer }: { niveau: NiveauMarche; pays?: string; onFermer: () => void }) {
  const t = useT();
  const fr = (v: number | undefined, n = 2) => (v == null ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));

  return (
    <Sheet
      open
      onClose={onFermer}
      title={t("Panier « {p} »", { p: niveau.panier })}
      sub={t("{n} séance(s) · la plus récente il y a {j} jour(s)", { n: String(niveau.seances.length), j: String(niveau.ageJours) })}
      wide
      foot={
        <nav className={styles.liens}>
          <Link href="/desk/courbe">
            <span className={styles.quoi}>{pays ? t("La courbe des taux · {p}", { p: pays }) : t("La courbe des taux")}</span>
            <span className={styles.ou}>/desk/courbe</span>
          </Link>
          <Link href="/desk/adjudications">
            <span className={styles.quoi}>{t("Les adjudications")}</span>
            <span className={styles.ou}>/desk/adjudications</span>
          </Link>
          <Link href="/desk/analyses">
            <span className={styles.quoi}>{t("Les analyses")}</span>
            <span className={styles.ou}>/desk/analyses</span>
          </Link>
        </nav>
      }
    >
      <section className={styles.sec}>
        <h4>{t("Les bougies des séances retenues")}</h4>
        <Bougies niveau={niveau} />
        <p className={styles.sous}>{t("Mèche : le carnet. Corps : du limite au moyen pondéré. La plus ancienne à gauche.")}</p>
      </section>

      <section className={styles.sec}>
        <h4>{t("Ce que chaque séance a payé")}</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("Séance")}</th>
              <th>{t("Durée")}</th>
              <th className={styles.n}>{t("Limite")}</th>
              <th className={styles.n}>{t("Moyen")}</th>
            </tr>
          </thead>
          <tbody>
            {niveau.seances.map((s) => (
              <tr key={s.id}>
                <td>{s.sessionOn}</td>
                <td>{s.tenor}</td>
                <td className={styles.n}>{fr(s.auLimite)} %</td>
                <td className={styles.n}>{fr(s.auMoyen)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {niveau.derniere.hypotheses.length > 0 ? (
        <section className={styles.sec}>
          <h4>{t("Ce que le calcul suppose")}</h4>
          <ul className={styles.hyp}>
            {niveau.derniere.hypotheses.map((h, i) => (
              <li key={i}>{t(h.key, Object.fromEntries(Object.entries(h.params ?? {}).map(([k, v]) => [k, String(v)])))}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </Sheet>
  );
}

/**
 * Le dessin, en SVG sans dépendance.
 *
 * Les quatre nombres d'une séance se rangent dans un chandelier sans qu'on
 * force, et la conversion en rendement INVERSE l'ordre des obligations : le
 * prix le plus haut donne le rendement le plus bas. On ne range donc jamais
 * les bords par leur nom mais par leur valeur, faute de quoi le corps sort à
 * l'envers sans que rien ne le signale.
 */
function Bougies({ niveau }: { niveau: NiveauMarche }) {
  const liste = [...niveau.seances].reverse();
  const W = 360;
  const H = 150;
  const ml = 34;
  const mr = 10;
  const mt = 10;
  const mb = 24;
  const vals = liste.flatMap((s) => [s.auLimite, s.auMoyen, s.rendement].filter((v): v is number => v != null));
  if (!vals.length) return null;
  const y0 = Math.floor(Math.min(...vals) - 0.3);
  const y1 = Math.ceil(Math.max(...vals) + 0.3);
  const X = (i: number) => ml + ((i + 0.5) / liste.length) * (W - ml - mr);
  const Y = (v: number) => H - mb - ((v - y0) / Math.max(0.001, y1 - y0)) * (H - mt - mb);
  const w = Math.min(16, ((W - ml - mr) / liste.length) * 0.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label="Bougies des séances retenues">
      {[y0, (y0 + y1) / 2, y1].map((g) => (
        <g key={g}>
          <line x1={ml} y1={Y(g)} x2={W - mr} y2={Y(g)} className={styles.grille} />
          <text x={ml - 4} y={Y(g) + 3} textAnchor="end" className={styles.etiq}>
            {g.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </text>
        </g>
      ))}
      {liste.map((s, i) => {
        const a = s.auLimite ?? s.rendement;
        const b = s.auMoyen ?? s.rendement;
        return (
          <g key={s.id}>
            <line x1={X(i)} y1={Y(Math.max(a, b))} x2={X(i)} y2={Y(Math.min(a, b))} className={styles.meche} />
            <rect x={X(i) - w / 2} y={Y(Math.max(a, b))} width={w} height={Math.max(2, Math.abs(Y(a) - Y(b)))} className={styles.corpsB} />
            <text x={X(i)} y={H - mb + 12} textAnchor="middle" className={styles.etiq}>
              {s.sessionOn.slice(2, 7)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
