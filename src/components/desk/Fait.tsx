import Link from "next/link";
import styles from "./Fait.module.css";

/**
 * « C'EST FAIT », QUI RESTE À L'ÉCRAN (12 novembre 2026).
 *
 * Clore une question, mettre une ligne à la une ou la retirer font disparaître ou apparaître une rangée : le message qui la confirmait vivait dans la rangée, et partait avec
 * elle. Le geste paraissait muet. L'action redirige maintenant vers la page avec ce qu'elle a fait dans l'adresse, et la page l'écrit en tête, jusqu'à ce qu'on le ferme.
 * Seuls un nom ou une référence passent par l'adresse : la phrase, elle, est écrite ici.
 */
export function Fait({ children, fermer, libelle }: { children: React.ReactNode; fermer: string; libelle: string }) {
  return (
    <p className={styles.fait} role="status">
      <span>{children}</span>
      <Link href={fermer} scroll={false}>
        {libelle}
      </Link>
    </p>
  );
}
