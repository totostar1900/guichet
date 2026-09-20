"use client";

import { useT } from "@/i18n/client";
import styles from "./FilterLine.module.css";

/**
 * On the phone, a list's row of filter chips becomes one line: « Filtres · 2 »
 * with the choices in words (Obligations · Cameroun), and « Tri » beside it.
 * Both open the list's sheet, where every control sits in full. Nothing slides
 * off-screen, the state of the list reads at a glance. Hidden on a desk, where
 * the toolbar stays in the page.
 */
export function FilterLine({ count, summary, onOpen, sortLabel }: { count: number; summary: string; onOpen: () => void; sortLabel?: string /* undefined: the list has no sort */ }) {
  const t = useT();
  return (
    <div className={styles.line}>
      <button type="button" className={`${styles.filters} ${count > 0 ? styles.on : ""}`} onClick={onOpen} aria-haspopup="dialog" aria-label={count > 0 ? `${t("Filtres")} · ${count} : ${summary}` : t("Filtres")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {t("Filtres")}
        {count > 0 && <b>{count}</b>}
      </button>
      <span className={styles.summary}>{summary || t("tout")}</span>
      {sortLabel !== undefined && (
        <button type="button" className={styles.sort} onClick={onOpen} aria-haspopup="dialog" aria-label={`${t("Tri")}${sortLabel ? ` : ${sortLabel}` : ""}`}>
          {t("Tri")}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
