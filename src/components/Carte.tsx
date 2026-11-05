import type { ReactNode } from "react";
import styles from "./Carte.module.css";

/**
 * L'ENCADRÉ EN RELIEF D'UNE SECTION (fiche d'une action, 9 novembre 2026, planche 1A).
 *
 * Le titre de la section est À PLAT, au-dessus : il n'est jamais dans la carte. La carte porte le contenu — un chiffre majeur et sa mosaïque, un graphe,
 * des rangées. Fond « --surface » (jamais plus sombre que la page), rayon « --rond », l'ombre de la maison ; en sombre un liseré clair en haut.
 * `plat` : une carte de rangées (documents, liens), sans marge haute ni basse, un filet entre deux rangées.
 */
export function Carte({ children, plat = false }: { children: ReactNode; plat?: boolean }) {
  return <div className={`${styles.carte} ${plat ? styles.plat : ""}`}>{children}</div>;
}
