import styles from "./PastilleVariation.module.css";

/**
 * LA PASTILLE DE VARIATION (C2, 2 novembre 2026) : un fond doux, le signe ÉCRIT.
 * La couleur redit le sens mais ne le porte jamais seule : « +0,40 % » se lit en
 * noir et blanc. Sans variation connue, la pastille n'existe pas (voir `variationDe`).
 */
export function PastilleVariation({ v, titre, periode, grande = false }: { v: number | undefined; titre?: string; /** Le chiffre de tête d'une ligne d'action : la variation est ce qu'on lit d'abord, le cours passe dessous. */ grande?: boolean; /** La période écrite à côté du chiffre (« 3 mois ») : un pourcentage sans durée ne dit pas ce qu'il mesure. */ periode?: string }) {
  if (v === undefined) return null;
  const sens = v > 0 ? styles.hausse : v < 0 ? styles.baisse : styles.stable;
  const texte = `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  return (
    <i className={`${styles.pastille} ${grande ? styles.grande : ""} ${sens}`} title={titre}>
      {texte}
      {periode && <span className={styles.periode}> · {periode}</span>}
    </i>
  );
}
