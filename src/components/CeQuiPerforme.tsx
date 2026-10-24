import Link from "next/link";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { performanceSur } from "@/lib/market/performe";
import { SensDuClassement } from "./SensDuClassement";
import styles from "./CeQuiPerforme.module.css";

/**
 * CE QUI PERFORME : les actions de la cote qui ont bougé, sur une fenêtre.
 *
 * POURQUOI UNE FENÊTRE, ET POURQUOI ELLE EST ÉCRITE. Relevé dans la maison :
 * l'indice bouge sur 70 des 271 séances lues, et une action garde son cours
 * dans 95 % d'entre elles. Un classement du JOUR serait donc une colonne de
 * zéros trois jours sur quatre, et « les plus fortes baisses » resterait
 * vide. La fenêtre rend le classement lisible — à condition de dire laquelle,
 * sans quoi le lecteur croit lire la séance.
 *
 * LES DEUX DATES SONT DES SÉANCES RÉELLES, et non « il y a trente jours ».
 * La lecture s'ancre sur la dernière séance publiée : si la place s'est tue
 * une semaine, la fenêtre reste celle qu'elle annonce.
 *
 * ELLE COÛTE TROIS REQUÊTES, et c'est tout l'objet de « market/performe ».
 * La même question posée à « indexPageData » en coûte une dizaine, dont sept
 * non bornées : juste sur la page du marché, hors de prix sur la page
 * d'arrivée.
 *
 * ELLE S'EFFACE QUAND RIEN N'A BOUGÉ, et ce jour-là arrive : aucune ligne
 * au-dessus du seuil d'affichage, ou pas assez d'histoire pour couvrir la
 * fenêtre. Une section qui annonce une performance et montre des zéros vaut
 * moins que pas de section.
 */
export async function CeQuiPerforme({ max = 3 }: { max?: number }) {
  const t = await getT();
  const classement = await performanceSur();
  if (!classement) return null;

  return (
    <section className={styles.bloc} aria-labelledby="ce-qui-performe">
      <div className={styles.tete}>
        <h2 id="ce-qui-performe" className={styles.titre}>
          {t("Ce qui performe")}
        </h2>
        <Link className={styles.tout} href="/societes">
          {t("Les sociétés")} →
        </Link>
      </div>
      {/* LA FENÊTRE EST DANS LA PHRASE, PAS DANS UNE NOTE DE BAS DE BLOC : un
          pourcentage sans sa période se lit comme celui du jour, et c'est
          justement le chiffre qui n'existe pas ici. */}
      <p className={styles.fenetre}>{t("Du {a} au {b}, d'une séance à l'autre.", { a: fmtDate(classement.depuis, false), b: fmtDate(classement.jusquAu, false) })}</p>
      <SensDuClassement lignes={classement.lignes} max={max} />
    </section>
  );
}
