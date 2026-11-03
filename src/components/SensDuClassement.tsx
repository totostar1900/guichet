"use client";

import Link from "next/link";
import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import type { Performance } from "@/lib/market/performe";
import { MiniCourbe } from "./MiniCourbe";
import styles from "./CeQuiPerforme.module.css";

/**
 * LE SENS DU CLASSEMENT : hausses ou baisses, sur la même fenêtre.
 *
 * Le seul état de la section, et il ne touche pas aux données : le classement
 * arrive calculé, trié, et cette pièce n'en montre qu'un bout. Rien à relire,
 * rien à recalculer — c'est pourquoi elle peut être un composant client sans
 * rien coûter.
 *
 * DEUX ONGLETS, ET L'ÉTAT NON CHOISI GARDE SON CONTOUR. Un segmenté qui ne se
 * distingue que par un remplissage disparaît pour qui ne voit pas la
 * différence de teinte ; « role=tab » et « aria-selected » le disent à qui
 * écoute la page, et la bordure le dit à qui la regarde.
 *
 * LE GRAPHE EST AU MILIEU DE LA LIGNE (3 novembre 2026) : le nom à gauche, la forme du cours sur trois mois au
 * centre, le cours et la variation à droite. Un côté ne se vide plus : « toujours deux à trois lignes », quitte
 * à les afficher à 0,0 %.
 */
export function SensDuClassement({ lignes, max = 3 }: { lignes: (Performance & { href: string })[]; max?: number }) {
  const t = useT();
  const { fmtDate } = useDates();
  const [baisse, setBaisse] = useState(false);

  /* Le classement arrive de la plus forte hausse à la plus forte baisse : les
     hausses sont donc la tête, et les baisses la queue, retournée pour que la
     plus forte vienne en premier dans les deux cas. */
  /* « TOUJOURS DEUX À TROIS LIGNES » (3 novembre 2026) : les hausses sont la tête du classement et les
     baisses sa queue, retournée pour que la plus forte vienne en premier. Aucun seuil : sur un marché calme,
     des lignes à 0,0 % complètent la liste plutôt que de la laisser se vider. */
  const vues = (baisse ? [...lignes].reverse() : lignes).slice(0, max);

  return (
    <>
      <div className={styles.sens} role="tablist" aria-label={t("Sens du classement")}>
        <button type="button" role="tab" aria-selected={!baisse} className={`${styles.onglet} ${baisse ? "" : styles.actif}`} onClick={() => setBaisse(false)}>
          {t("Hausses")}
        </button>
        <button type="button" role="tab" aria-selected={baisse} className={`${styles.onglet} ${baisse ? styles.actif : ""}`} onClick={() => setBaisse(true)}>
          {t("Baisses")}
        </button>
      </div>

      <ul className={styles.liste}>
        {vues.map((l) => {
          const arrondi = Math.round(l.variationPct * 10) / 10;
          const ton = arrondi > 0 ? styles.hausse : arrondi < 0 ? styles.baisse : styles.stable;
          return (
            <li key={l.isin}>
              <Link href={l.href} className={styles.ligne}>
                <span className={styles.qui}>
                  <b className={styles.mnemo}>{l.mnemo}</b>
                  <span className={styles.nom}>{l.nom}</span>
                </span>
                <MiniCourbe serie={l.serie} />
                <span className={styles.px}>
                  <b className={styles.cours}>{fmt(Math.round(l.cours))}</b>
                  {/* LE SIGNE EST ÉCRIT, pas seulement teinté : qui ne distingue pas le vert du rouge lit
                      « −3,1 % » et sait tout. UNE LIGNE ENTRÉE PENDANT LA FENÊTRE le dit dans l'infobulle. */}
                  <span className={`${styles.pilule} ${ton}`} title={l.entree ? t("Depuis l'entrée à la cote, le {d}", { d: fmtDate(l.depuis, false) }) : undefined}>
                    {arrondi > 0 ? "+" : arrondi < 0 ? "−" : ""}
                    {Math.abs(l.variationPct).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
