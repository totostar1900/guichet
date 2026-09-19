"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import styles from "./ListNav.module.css";

/**
 * A reader's place in a list is remembered by the list itself (URL with its
 * filters and sort, the ordered ids it showed, the scroll position). On a line's
 * page this bar takes them back to that exact list, and lets them step to the
 * previous or next line without leaving the page.
 */
export const LIST_ORDER_KEY = "guichet:listOrder";
export const LIST_SCROLL_KEY = "guichet:listScroll";

export interface ListMemory {
  url: string; // pathname + query of the list as it was shown
  ids: string[]; // the lines in the order shown
  label: string; // "Toutes les offres" | "Tous les fonds"
  titles?: string[]; // same order: what the phone shows of the neighbour while the finger drags
}


export function rememberList(m: ListMemory) {
  try {
    sessionStorage.setItem(LIST_ORDER_KEY, JSON.stringify(m));
  } catch {
    // storage unavailable
  }
}

export function ListNav({ id, fallbackHref, fallbackLabel }: { id: string; fallbackHref: string; fallbackLabel: string }) {
  const t = useT();
  // Read once the page is on the client (the server knows nothing of the reader's list); the raw string is stable, so parsing it is cheap.
  const raw = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(LIST_ORDER_KEY);
      } catch {
        return null;
      }
    },
    () => null,
  );
  let mem: ListMemory | null = null;
  try {
    mem = raw ? (JSON.parse(raw) as ListMemory) : null;
  } catch {
    mem = null;
  }
  const known = mem && mem.ids.includes(id) ? mem : null;
  const i = known ? known.ids.indexOf(id) : -1;
  const prev = known && i > 0 ? known.ids[i - 1] : null;
  const next = known && i >= 0 && i < known.ids.length - 1 ? known.ids[i + 1] : null;
  return (
    <div className={styles.bar}>
      <Link href={known ? known.url : fallbackHref} className={`btn sm ${styles.back}`}>
        ← {t(known ? known.label : fallbackLabel)}
      </Link>
      {known && (
        <div className={styles.steps}>
          {prev ? (
            <Link href={`/offres/${prev}`} className="btn sm ghost" rel="prev">
              ‹ {t("Précédente")}
            </Link>
          ) : (
            <span className={`btn sm ghost ${styles.off}`}>‹ {t("Précédente")}</span>
          )}
          <span className={styles.pos}>
            {known.ids.length <= 10 && (
              <span className={styles.dots} aria-hidden="true">
                {known.ids.map((k, n) => (
                  <i key={k} className={n === i ? styles.dotOn : undefined} />
                ))}
              </span>
            )}
            {i + 1} / {known.ids.length}
          </span>
          {next ? (
            <Link href={`/offres/${next}`} className="btn sm ghost" rel="next">
              {t("Suivante")} ›
            </Link>
          ) : (
            <span className={`btn sm ghost ${styles.off}`}>{t("Suivante")} ›</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Lists call this once mounted: restores the scroll of a list the reader came
 * back to, and saves it the moment they leave for a line (the router scrolls
 * to the top on its own, so saving on scroll would only ever record zero).
 */
export function useListScroll(url: string) {
  useEffect(() => {
    const timers: number[] = [];
    try {
      const raw = sessionStorage.getItem(LIST_SCROLL_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { url: string; y: number };
        // The router's own scroll-to-top lands after mount: restore a few times over the first moments.
        if (saved.url === url && saved.y > 0) for (const ms of [0, 80, 240]) timers.push(window.setTimeout(() => window.scrollTo({ top: saved.y }), ms));
      }
    } catch {
      // storage unavailable
    }
    const save = () => {
      try {
        sessionStorage.setItem(LIST_SCROLL_KEY, JSON.stringify({ url, y: window.scrollY }));
      } catch {
        // storage unavailable
      }
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (a && a.getAttribute("href")?.startsWith("/offres/")) save();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", save);
      timers.forEach(clearTimeout);
    };
  }, [url]);
}
