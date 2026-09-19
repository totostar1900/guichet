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
const scrollKey = (pathname: string) => `guichet:listScroll:${pathname}`;

/** The URL a list (by pathname) was last shown with, filters and sort included; null when never shown. */
export function rememberedListUrl(pathname: string): string | null {
  try {
    const raw = sessionStorage.getItem(scrollKey(pathname));
    return raw ? (JSON.parse(raw) as { url: string }).url : null;
  } catch {
    return null;
  }
}

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
 * back to (from a line, or by swiping back from the other list), and keeps
 * the list's URL and position up to date as they scroll, one memory per list.
 */
export function useListScroll(url: string) {
  useEffect(() => {
    const pathname = url.split("?")[0];
    const key = scrollKey(pathname);
    const timers: number[] = [];
    let saved: { url: string; y: number } | null = null;
    try {
      const raw = sessionStorage.getItem(key);
      const s = raw ? (JSON.parse(raw) as { url: string; y: number }) : null;
      if (s && s.url === url && s.y > 0) saved = s;
    } catch {
      // storage unavailable
    }
    // The router scrolls to the top on its own, sometimes late (a streamed list): for a second, the saved
    // position wins over any scroll that is not it, and nothing is recorded.
    const until = performance.now() + 1000;
    if (saved) for (const ms of [0, 80, 240, 600]) timers.push(window.setTimeout(() => window.scrollTo({ top: saved!.y }), ms));
    // Once the address has moved on (the router scrolls to the top before the old page unmounts), nothing more is recorded.
    const here = () => `${window.location.pathname}${window.location.search}` === url;
    const save = () => {
      if (!here()) return;
      try {
        sessionStorage.setItem(key, JSON.stringify({ url, y: window.scrollY }));
      } catch {
        // storage unavailable
      }
    };
    let throttle = 0;
    const onScroll = () => {
      if (performance.now() < until) {
        if (saved && Math.abs(window.scrollY - saved.y) > 2) window.scrollTo({ top: saved.y });
        return;
      }
      if (throttle) return;
      throttle = window.setTimeout(() => {
        throttle = 0;
        save();
      }, 120);
    };
    if (!saved) save();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      if (throttle) clearTimeout(throttle);
      timers.forEach(clearTimeout);
    };
  }, [url]);
}
