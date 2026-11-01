import Link from "next/link";
import { getT } from "@/i18n/server";
import styles from "./RaccourcisColonne.module.css";

/**
 * L'HORLOGE ET L'ÉTOILE, EN TÊTE DE LA COLONNE DE GAUCHE (à partir de 1041 px).
 *
 * Sur le téléphone et jusqu'à 1040 px, ce sont deux des trois boutons de la
 * barre (« BarreDuHaut »). Au large la barre n'existe pas : la colonne est la
 * navigation, et c'est donc là qu'ils se posent — sous l'enseigne, au-dessus de
 * la recherche. Pas de « trois barres » : la colonne EST le menu.
 *
 * Elle porte la même pastille ambre que l'horloge de la barre (les lignes qui
 * ferment sous sept jours, rien en dessous de un). Une pièce serveur, sans
 * état : deux liens.
 */
export async function RaccourcisColonne({ urgentes, favoris }: { urgentes: number; /** Le client a un favori : sans, la ligne n'existe pas. */ favoris: boolean }) {
  const t = await getT();
  return (
    <div className={styles.raccourcis}>
      <Link href="/echeances" className={`${styles.lien} ${styles.ambre}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
        <span>{t("Échéances")}</span>
        {urgentes > 0 && (
          <em className={styles.pas} aria-label={t("{n} sous sept jours", { n: String(urgentes) })}>
            {urgentes > 9 ? "9+" : urgentes}
          </em>
        )}
      </Link>
      {favoris && (
        <Link href="/favoris" className={`${styles.lien} ${styles.or}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.6l-5.5 2.9 1-6.2L3 9.9l6.2-.9z" />
          </svg>
          <span>{t("Favoris")}</span>
        </Link>
      )}
    </div>
  );
}
