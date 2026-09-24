import styles from "./Skeleton.module.css";

/**
 * Ce qu'on montre pendant qu'une page se rend.
 *
 * Sur téléphone, passer d'une carte à la suivante d'un glissement ne coûtait
 * rien au doigt mais tout à l'attente : la page voisine est préchargée, or une
 * route dynamique n'a pas d'enveloppe à précharger tant qu'aucune attente
 * n'est déclarée. Sans elle, le glissement se termine sur l'ancienne page
 * figée, et le lecteur ne sait pas si son geste a été pris.
 *
 * Ces blocs ont la forme de ce qui vient : un titre, des cartes de chiffres,
 * un bloc de graphique. Ils ne remplacent pas la vitesse, ils rendent l'attente
 * lisible ; la vraie réponse est de moins lire en base, ce que fait `memo.ts`.
 */
export function FicheSkeleton() {
  return (
    <div className={styles.page} aria-hidden="true">
      <div className={`${styles.sk} ${styles.title}`} />
      <div className={`${styles.sk} ${styles.line} ${styles.half}`} />
      <div className={styles.cards}>
        <div className={`${styles.sk} ${styles.card}`} />
        <div className={`${styles.sk} ${styles.card}`} />
        <div className={`${styles.sk} ${styles.card}`} />
      </div>
      <div className={`${styles.sk} ${styles.block}`} />
      <div className={styles.rows}>
        <div className={`${styles.sk} ${styles.row}`} />
        <div className={`${styles.sk} ${styles.row}`} />
        <div className={`${styles.sk} ${styles.row}`} />
      </div>
    </div>
  );
}

/** Une liste qui se charge : un titre, une barre de filtres, des rangées. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className={styles.page} aria-hidden="true">
      <div className={`${styles.sk} ${styles.title}`} />
      <div className={`${styles.sk} ${styles.line} ${styles.half}`} />
      <div className={`${styles.sk} ${styles.row}`} />
      <div className={styles.rows}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`${styles.sk} ${styles.row}`} />
        ))}
      </div>
    </div>
  );
}
