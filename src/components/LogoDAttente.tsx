import styles from "./LogoDAttente.module.css";

/**
 * LE G QUI SE TRACE (20 novembre 2026, planche « Écran d'attente », 1A).
 *
 * Le contour du G se dessine, puis se remplit d'or, et le trait du bas s'allonge : « ça commence » et « ça finit ». Il joue à l'ouverture, sur la porte, dans le temps que prend l'application à se charger : le dessin est rendu par le serveur, donc il paraît avant que le moindre script ne s'exécute. Fait de la marque réelle (le G or sur bleu nuit). Réduire les animations le laisse fixe et complet.
 */
export function LogoDAttente({ taille = 112 }: { taille?: number }) {
  return (
    <svg className={styles.logo} width={taille} height={taille} viewBox="0 0 512 512" role="img" aria-label="Guichet">
      <text className={styles.trait} x="256" y="330" textAnchor="middle">G</text>
      <text className={styles.plein} x="256" y="330" textAnchor="middle">G</text>
      <rect className={styles.barre} x="150" y="392" width="212" height="18" rx="9" />
    </svg>
  );
}
