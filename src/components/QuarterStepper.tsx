import Link from "next/link";
import { getLang, getT } from "@/i18n/server";
import type { QuarterKey } from "@/lib/market/index-quarter";
import styles from "./QuarterStepper.module.css";

/**
 * Le trimestre d'avant, celui qu'on lit, celui d'après, et toutes les notes.
 *
 * La liste plate des autres trimestres tenait tant qu'il y en avait trois.
 * À raison de quatre par an elle compte vingt entrées en 2031, dans une
 * colonne de 196 px, et elle serait la plus haute chose de la page. Un pas à
 * pas garde la même hauteur pour toujours ; ce qu'il cache, l'archive le
 * montre en entier, et c'est la condition pour qu'il soit honnête.
 *
 * `list` : là où la place ne manque pas, les derniers trimestres se disent en
 * entier, d'un coup, sans qu'il faille passer par le voisin pour atteindre
 * l'autre. Le rail d'ordinateur est de ceux-là ; le pied d'une feuille de
 * téléphone ne l'est pas, et garde le pas à pas.
 *
 * Dans les deux formes, le lien vers l'archive reste : c'est lui qui rend la
 * chose honnête, puisque ni l'une ni l'autre ne montre la série entière.
 */
export async function QuarterStepper({ older, newer, current, total, wide, list }: { older?: QuarterKey; newer?: QuarterKey; current: QuarterKey; total: number; wide?: boolean; /** les derniers trimestres, en entier, au lieu des deux voisins */ list?: QuarterKey[] }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const label = (q: { q: number; year: number }) => t(q.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: q.q, y: q.year });
  // L'abrégé ne passe pas par le dictionnaire : une clef « T{n} {y} » y devient
  // l'expression ^T(.+?) (.+?)$, qui attrape toute phrase française commençant
  // par un T. Une lettre choisie à la langue est plus sûre et plus claire.
  const shortLabel = (q: { q: number; year: number }) => `${lang === "en" ? "Q" : "T"}${q.q} ${q.year}`;
  const name = wide || list ? label : shortLabel;
  const all = (
    <Link href="/indice/notes" className={styles.all}>
      {t("Toutes les notes ({n})", { n: total })}
    </Link>
  );
  if (list)
    return (
      <nav className={styles.list} aria-label={t("Les autres trimestres")}>
        {list.map((q) => (
          <Link key={q.key} href={`/indice/note/${q.key.toLowerCase()}`}>
            {name(q)}
          </Link>
        ))}
        {all}
      </nav>
    );
  return (
    <nav className={`${styles.step} ${wide ? styles.wide : ""}`} aria-label={t("Les autres trimestres")}>
      {older ? (
        <Link href={`/indice/note/${older.key.toLowerCase()}`} className={styles.side} rel="prev">
          ‹ {name(older)}
        </Link>
      ) : (
        <span className={`${styles.side} ${styles.off}`} aria-hidden="true">
          —
        </span>
      )}
      <b className={styles.here}>{name(current)}</b>
      {newer ? (
        <Link href={`/indice/note/${newer.key.toLowerCase()}`} className={`${styles.side} ${styles.right}`} rel="next">
          {name(newer)} ›
        </Link>
      ) : (
        <span className={`${styles.side} ${styles.right} ${styles.off}`} aria-hidden="true">
          —
        </span>
      )}
      {all}
    </nav>
  );
}
