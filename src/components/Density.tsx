"use client";

import { useT } from "@/i18n/client";
import { useSyncExternalStore } from "react";
import styles from "./Density.module.css";

/**
 * How dense the cards are on the phone: « Détaillé » (the number, three
 * facts, one action) or « Compact » (two lines: the title, then the number
 * with its condition and the date). Remembered on the device; the same
 * choice for securities and funds.
 */
export type Density = "detail" | "compact";
const KEY = "guichet:cartes";
const EVENT = "guichet:cartes";

function read(): Density {
  try {
    return localStorage.getItem(KEY) === "compact" ? "compact" : "detail";
  } catch {
    return "detail";
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
export function useDensity(): Density {
  return useSyncExternalStore(subscribe, read, () => "detail");
}
function set(d: Density) {
  try {
    localStorage.setItem(KEY, d);
  } catch {
    // storage unavailable
  }
  window.dispatchEvent(new Event(EVENT));
}

export function DensitySwitch({ className }: { className?: string }) {
  const t = useT();
  const d = useDensity();
  return (
    <span className={`${styles.dens} ${className ?? ""}`} role="group" aria-label={t("Densité des cartes")}>
      {(["detail", "compact"] as Density[]).map((k) => {
        const label = t(k === "detail" ? "Cartes détaillées" : "Cartes compactes");
        return (
          <button key={k} type="button" className={d === k ? styles.on : undefined} aria-pressed={d === k} aria-label={label} title={label} onClick={() => set(k)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {k === "detail" ? <path d="M4 5h16v6H4z M4 14h16v6H4z" /> : <path d="M4 6h16 M4 10h10 M4 15h16 M4 19h10" />}
            </svg>
          </button>
        );
      })}
    </span>
  );
}
