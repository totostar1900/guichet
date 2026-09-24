import { fmt } from "@/lib/format";
import styles from "./Amount.module.css";

/**
 * Un montant et son unité, partout de la même façon.
 *
 * « 9 700 000 FCFA » écrit d'un seul trait met l'unité à la taille du chiffre :
 * à 1,2 rem, quatre lettres qui ne changent jamais prennent autant de largeur
 * que le million qu'on est venu lire, et sur un téléphone elles poussent le
 * nombre à la ligne. L'unité passe donc en petit et en gris : elle reste là
 * pour qui en doute, elle ne dispute plus la place au chiffre.
 *
 * Le nombre est groupé par milliers (`fmt` suit la convention française avec
 * une espace insécable) et tabulaire, de sorte que deux montants l'un sous
 * l'autre alignent leurs colonnes de chiffres.
 */
export function Amount({ value, unit = "FCFA", className, sign }: { value: number; unit?: string | null; className?: string; sign?: boolean }) {
  const n = Math.round(value);
  return (
    <span className={`${styles.amount} ${className ?? ""}`}>
      {sign && n > 0 ? "+" : ""}
      {fmt(n)}
      {unit ? <small className={styles.unit}>{unit}</small> : null}
    </span>
  );
}
