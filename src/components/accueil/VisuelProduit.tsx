import styles from "./Visuels.module.css";

/**
 * L'ÉCRAN DE L'APPLICATION, DESSINÉ SANS UN CHIFFRE (14 novembre 2026, planche « vitrine », option A).
 *
 * Un visiteur qui n'a pas de compte ne voit nulle part ce qu'il y a derrière la porte. Le dessin montre la forme d'une ligne, d'une courbe et d'une liste : de la matière,
 * pas ce qu'elle dit. AUCUN TAUX, AUCUN MONTANT, AUCUN MOT : la règle de la vitrine tient, et rien n'est à traduire. Décoratif : caché des lecteurs d'écran.
 */
export function VisuelProduit() {
  return (
    <div className={styles.telephone} aria-hidden="true">
      <svg viewBox="0 0 220 360" role="presentation">
        <rect className={styles.coque} x="6" y="6" width="208" height="348" rx="28" />
        <rect className={styles.encoche} x="84" y="16" width="52" height="6" rx="3" />
        {/* L'en-tête et la ligne mise en avant : un filet d'or tout autour, le geste de la sélection du desk. */}
        <rect className={styles.barre} x="24" y="40" width="70" height="8" rx="4" />
        <rect className={styles.carteOr} x="22" y="62" width="176" height="72" rx="12" />
        <circle className={styles.rond} cx="46" cy="86" r="12" />
        <rect className={styles.barre} x="68" y="78" width="84" height="7" rx="3.5" />
        <rect className={styles.barreDouce} x="68" y="92" width="58" height="6" rx="3" />
        <rect className={styles.puce} x="154" y="76" width="30" height="16" rx="8" />
        <rect className={styles.barreDouce} x="38" y="112" width="130" height="6" rx="3" />
        {/* Une courbe sans graduation, deux tracés : de la matière, pas des valeurs. */}
        <rect className={styles.carte} x="22" y="148" width="176" height="86" rx="12" />
        <polyline className={styles.courbeOr} points="36,212 62,200 88,206 114,184 140,190 166,170 184,176" />
        <polyline className={styles.courbeBleue} points="36,220 70,214 104,208 138,202 172,196 184,194" />
        {/* Trois rangées de liste : un rond, deux barres. */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect className={styles.rangee} x="22" y={248 + i * 32} width="176" height="26" rx="10" />
            <circle className={i === 0 ? styles.rond : styles.rondBleu} cx="40" cy={261 + i * 32} r="7" />
            <rect className={styles.barre} x="56" y={256 + i * 32} width={70 - i * 8} height="6" rx="3" />
            <rect className={styles.barreDouce} x="150" y={256 + i * 32} width="34" height="6" rx="3" />
          </g>
        ))}
      </svg>
    </div>
  );
}
