import styles from "./Visuels.module.css";

/**
 * LA DONNÉE, MONTRÉE PAR SA FORME (14 novembre 2026, planche « vitrine », option A) : l'indice, la courbe des taux et des volumes, tracés sans graduation ni valeur.
 * On voit qu'il y a de la matière, pas ce qu'elle dit : les chiffres s'ouvrent avec le compte. Une légende le dit, en toutes lettres, sous le dessin.
 */
export function FormesDeLaDonnee({ legende }: { legende: string }) {
  return (
    <figure className={styles.formes}>
      <svg viewBox="0 0 300 120" role="img" aria-label={legende}>
        <rect className={styles.fond} x="1" y="1" width="298" height="118" rx="12" />
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={`b${i}`} className={styles.volume} x={20 + i * 17} y={108 - [8, 14, 6, 18, 10, 22, 9, 12, 20, 7, 16, 11, 24, 8, 13, 17][i]} width="6" height={[8, 14, 6, 18, 10, 22, 9, 12, 20, 7, 16, 11, 24, 8, 13, 17][i]} rx="1.5" />
        ))}
        <polyline className={styles.courbeOr} points="16,70 52,62 88,66 124,44 160,52 196,30 232,38 284,24" />
        <polyline className={styles.courbeBleue} points="16,86 70,80 124,72 178,66 232,58 284,52" />
      </svg>
      <figcaption>{legende}</figcaption>
    </figure>
  );
}
