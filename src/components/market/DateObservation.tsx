"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";
import styles from "./DateObservation.module.css";

/**
 * La courbe telle qu'elle était, à une date qu'on choisit.
 *
 * Élargir la fenêtre pour peupler une courbe mélange les époques : un prix de
 * dix-huit mois s'y range à côté d'un prix de la semaine, et la courbe ne dit
 * plus le coût de l'argent à aucun moment précis. La bonne façon d'utiliser
 * cinq ans d'historique est de reculer la date d'observation et d'appliquer les
 * mêmes règles à cette date-là : on obtient une courbe vraie d'un moment, au
 * lieu d'une courbe fausse de tous.
 *
 * Le choix passe par l'adresse et non par un état de composant. Reculer d'un an
 * est un acte d'analyse, pas un survol : cela arrive rarement, cela mérite
 * d'être partageable par un lien, et cela évite d'envoyer au navigateur vingt
 * courbes dont il n'affichera qu'une.
 *
 * « scroll: false » parce que la section est au milieu de la page et qu'on veut
 * y rester.
 */
export function DateObservation({ ancres, courant }: { ancres: { cle: string; mot: string; le: string }[]; courant: string }) {
  const t = useT();
  return (
    <div className={styles.grp}>
      <div className={styles.tete}>
        <span className={styles.etiq} id="courbe-observation">
          {t("Observée le")}
        </span>
        <details className={styles.aide}>
          <summary title={t("Ce que ce réglage change")} aria-label={t("Ce que ce réglage change")}>
            ?
          </summary>
          <p>
            {t(
              "La figure est refaite telle qu'elle se serait lue ce jour-là : seules les séances antérieures sont ramassées, et chaque point se range à la durée qui lui restait à cette date. La courbe d'aujourd'hui reste en filigrane derrière, pour l'écart. Une réserve, et elle est entière : la reconstruction se fait avec les données D'AUJOURD'HUI. Une séance relue la semaine dernière y figure, et une séance qu'on n'avait pas encore ramassée à l'époque y figure aussi. C'est la courbe de ce jour-là vue d'ici, et non ce que nous en savions alors.",
            )}
          </p>
        </details>
      </div>
      <div className={styles.seg} role="group" aria-labelledby="courbe-observation">
        {ancres.map((a) => (
          <Link
            key={a.cle}
            href={a.cle === "aujourdhui" ? "/desk/analyses#courbe" : `/desk/analyses?le=${a.le}#courbe`}
            aria-current={courant === a.le}
            scroll={false}
            prefetch={false}
          >
            {a.mot}
          </Link>
        ))}
      </div>
    </div>
  );
}
