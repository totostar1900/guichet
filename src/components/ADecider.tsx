import Link from "next/link";
import { getT } from "@/i18n/server";
import styles from "./ADecider.module.css";

/**
 * Le compteur des décisions, dans la bande.
 *
 * C'est la seule chose de la bande qui change dans la journée, et c'est le
 * point de la refonte : les gestes ne vivaient qu'à un seul endroit, la
 * console, qu'il fallait penser à ouvrir. Un client qui lit une fiche ou
 * parcourt la cote ne voyait rien de ce qui l'attend. Le compteur suit
 * partout, et il mène toujours au même endroit.
 *
 * IL NE PARAÎT PAS QUAND IL EST À ZÉRO. Une pastille grise qui annonce
 * « rien » apprend à ne plus la regarder, et le jour où elle porte un chiffre
 * l'oeil passe dessus. Ce qui ne demande rien ne demande pas de place.
 */
export async function ADecider({ n }: { n: number }) {
  if (n <= 0) return null;
  const t = await getT();
  return (
    <Link className={styles.compteur} href="/#a-decider" aria-label={t("{n} décisions vous attendent", { n: String(n) })}>
      <span>{t("À décider")}</span>
      <b>{n}</b>
    </Link>
  );
}
