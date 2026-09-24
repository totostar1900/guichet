import type { ReactNode } from "react";
import styles from "./RefTotals.module.css";

/**
 * La conclusion d'un bloc de référence : ce qui sort, ce qui rentre, le taux.
 *
 * Les trois chiffres que le lecteur vient chercher étaient trois lignes de plus
 * dans la grille du calcul, à la même taille que « coupon couru (37 jours) »,
 * distinguées par du gras et une couleur. Ils se lisaient comme du détail alors
 * qu'ils sont la réponse. Ils quittent donc la grille : elle garde le chemin,
 * cette bande porte le résultat.
 *
 * Le taux est en dessous et non à côté, parce qu'il ne se compare pas aux deux
 * autres : les deux premiers sont des francs, lui est un pourcentage par an, et
 * les aligner inviterait à les lire comme une même famille.
 */
export interface RefFigure {
  label: string;
  value: ReactNode;
  note?: string;
}

export function RefTotals({ figures, rate }: { figures: RefFigure[]; rate?: { label: string; value: string; note?: string } }) {
  return (
    <div className={styles.band}>
      <div className={styles.figures} data-n={figures.length}>
        {figures.map((f) => (
          <div key={f.label} className={styles.fig}>
            <span className={styles.lab}>{f.label}</span>
            <b className={styles.val}>{f.value}</b>
            {f.note && <em className={styles.note}>{f.note}</em>}
          </div>
        ))}
      </div>
      {rate && (
        <div className={styles.rate}>
          <span>
            {rate.label}
            {rate.note && <em className={styles.note}>{rate.note}</em>}
          </span>
          <b>{rate.value}</b>
        </div>
      )}
    </div>
  );
}
