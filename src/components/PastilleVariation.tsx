import styles from "./PastilleVariation.module.css";

/**
 * LA PASTILLE DE VARIATION (C2, 2 novembre 2026) : un fond doux, le signe ÉCRIT.
 * La couleur redit le sens mais ne le porte jamais seule : « +0,40 % » se lit en
 * noir et blanc. Sans variation connue, la pastille n'existe pas (voir `variationDe`).
 */
export function PastilleVariation({ v, titre }: { v: number | undefined; titre?: string }) {
  if (v === undefined) return null;
  const sens = v > 0 ? styles.hausse : v < 0 ? styles.baisse : styles.stable;
  const texte = `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  return (
    <i className={`${styles.pastille} ${sens}`} title={titre}>
      {texte}
    </i>
  );
}
