"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import styles from "./Fold.module.css";

/**
 * A page in sections that fold: each section is a thin gold line, its title
 * and a chevron; the body slides under it. What is folded stays folded on
 * this device. `FoldAll` at the top of the page folds or opens every section
 * of its group in one tap. The title keeps the section's anchor id, so the
 * « Sur cette page » line and the sommaire still land on it.
 */
const EVENT = "guichet:fold";
const key = (group: string, id: string) => `guichet:fold:${group}:${id}`;

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
const read = (k: string) => {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // storage unavailable: the fold lasts for this page
  }
  window.dispatchEvent(new Event(EVENT));
};

/** `hint`: the figure and the word of state that stay on the line once folded (« 2 · une à signer »): folded, the page reads as a dashboard. */
export function FoldSection({ group, id, title, aside, hint, children, defaultOpen = true }: { group: string; id: string; title: ReactNode; aside?: ReactNode; hint?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const t = useT();
  const stored = useSyncExternalStore(subscribe, () => read(key(group, id)), () => "");
  const open = stored ? stored === "open" : defaultOpen;
  // A link to this section's anchor opens it, wherever it was folded.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === `#${id}`) write(key(group, id), "open");
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [group, id]);
  return (
    <section className={`${styles.section} ${open ? styles.open : ""}`} data-fold={id}>
      <div className={styles.head}>
        <h2 className={styles.title} id={id}>
          {title}
          {hint && <small className={styles.hint}>{hint}</small>}
        </h2>
        {aside && open && <span className={styles.aside}>{aside}</span>}
        <button type="button" className={styles.chev} aria-expanded={open} aria-controls={`fold-${id}`} aria-label={`${open ? t("Replier") : t("Déplier")} : ${typeof title === "string" ? title : ""}`} onClick={() => write(key(group, id), open ? "closed" : "open")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      <div id={`fold-${id}`} className={styles.body} hidden={!open}>
        {children}
      </div>
    </section>
  );
}

/** Folds or opens every section of the group; reads « all open » when none is folded. */
export function FoldAll({ group, ids }: { group: string; ids: string[] }) {
  const t = useT();
  const states = useSyncExternalStore(subscribe, () => ids.map((id) => read(key(group, id))).join(","), () => "");
  const anyOpen = states ? states.split(",").some((s) => s !== "closed") : true;
  const set = (v: "open" | "closed") => {
    for (const id of ids) {
      try {
        localStorage.setItem(key(group, id), v);
      } catch {
        // storage unavailable
      }
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <button type="button" className={`${styles.all} ${anyOpen ? "" : styles.allClosed}`} onClick={() => set(anyOpen ? "closed" : "open")}>
      {t(anyOpen ? "Tout replier" : "Tout déplier")}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}
