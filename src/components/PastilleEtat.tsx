import type { TonDEtat } from "@/lib/domain/accueil";
import styles from "./PastilleVariation.module.css";

/**
 * LA PASTILLE D'ÉTAT (2A, 2 novembre 2026) : le MOT reste écrit, la teinte le redit.
 * « Réglée » se lit en noir et blanc ; le vert dit seulement que c'est fait.
 */
export function PastilleEtat({ ton, children }: { ton: TonDEtat; children: React.ReactNode }) {
  const classe = ton === "bon" ? styles.hausse : ton === "attention" ? styles.attention : styles.stable;
  return <i className={`${styles.pastille} ${classe}`}>{children}</i>;
}
