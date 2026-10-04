"use client";

import { useT } from "@/i18n/client";
import styles from "./FilterLine.module.css";

/**
 * On the phone, a list's row of filter chips becomes one line: « Filtres · 2 »
 * with the choices in words (Obligations · Cameroun), and « Tri » beside it.
 * Both open the list's sheet, where every control sits in full. Nothing slides
 * off-screen, the state of the list reads at a glance. Hidden on a desk, where
 * the toolbar stays in the page.
 *
 * LES DEUX BOUTONS NE FAISAIENT QU'UN. Ils étaient bien deux à l'écran, mais
 * ils appelaient la même fonction, et celui du tri n'affichait pas sa valeur :
 * on avait donc deux commandes pour une action, dont une muette. « Trier » dit
 * maintenant sur quoi l'on trie, et chacun ouvre la feuille SUR SA PARTIE.
 */
export function FilterLine({ count, summary, onOpen, sortLabel }: { count: number; summary: string; onOpen: (cible: "filtres" | "tri") => void; sortLabel?: string /* undefined: the list has no sort */ }) {
  const t = useT();
  return (
    <div className={styles.line}>
      <button type="button" className={`${styles.filters} ${count > 0 ? styles.on : ""}`} onClick={() => onOpen("filtres")} aria-haspopup="dialog" aria-label={count > 0 ? `${t("Filtres")} · ${count} : ${summary}` : t("Filtres")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {t("Filtres")}
        {count > 0 && <b>{count}</b>}
      </button>
      <span className={styles.summary}>{summary || t("tout")}</span>
      {sortLabel !== undefined && (
        <button type="button" className={`${styles.sort} ${sortLabel ? styles.on : ""}`} onClick={() => onOpen("tri")} aria-haspopup="dialog" aria-label={`${t("Tri")}${sortLabel ? ` : ${sortLabel}` : ""}`}>
          {t("Tri")}
          {sortLabel && <b>{sortLabel}</b>}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
