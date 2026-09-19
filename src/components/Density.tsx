"use client";

import { useT } from "@/i18n/client";
import { useState, useSyncExternalStore } from "react";
import { Sheet } from "./mobile/Sheet";
import styles from "./Density.module.css";

/**
 * How the cards look, the reader's choice, remembered on the device and the
 * same for securities and funds: the density (« Détaillé », the number, three
 * facts, one action; « Compact », two lines) and the distinction between one
 * card and the next (an alternating shade, the family colour on an edge, a
 * tint, a shadow). Lists read both and set `data-sep` on their container;
 * the card CSS does the rest.
 */
export type Density = "detail" | "compact";
export type Distinction = "none" | "zebra" | "half" | "full" | "left" | "tint" | "shadow" | "zebrahalf";
export const DISTINCTIONS: [Distinction, string][] = [
  ["none", "Aucune"],
  ["zebra", "Alternée"],
  ["half", "Demi-trait famille"],
  ["full", "Trait famille"],
  ["left", "Bande gauche"],
  ["tint", "Teinte famille"],
  ["shadow", "Ombre"],
  ["zebrahalf", "Alternée + demi-trait"],
];
const KEY = "guichet:cartes";
const SEP_KEY = "guichet:cartes:sep";
const EVENT = "guichet:cartes";

function readDensity(): Density {
  try {
    return localStorage.getItem(KEY) === "compact" ? "compact" : "detail";
  } catch {
    return "detail";
  }
}
function readSep(): Distinction {
  try {
    const v = localStorage.getItem(SEP_KEY);
    return DISTINCTIONS.some(([k]) => k === v) ? (v as Distinction) : "zebra";
  } catch {
    return "zebra";
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
  return useSyncExternalStore(subscribe, readDensity, () => "detail");
}
export function useDistinction(): Distinction {
  return useSyncExternalStore(subscribe, readSep, () => "zebra");
}
function write(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    // storage unavailable
  }
  window.dispatchEvent(new Event(EVENT));
}

function DensityButtons() {
  const t = useT();
  const d = useDensity();
  return (
    <>
      {(["detail", "compact"] as Density[]).map((k) => {
        const label = t(k === "detail" ? "Cartes détaillées" : "Cartes compactes");
        return (
          <button key={k} type="button" className={d === k ? styles.on : undefined} aria-pressed={d === k} aria-label={label} title={label} onClick={() => write(KEY, k)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {k === "detail" ? <path d="M4 5h16v6H4z M4 14h16v6H4z" /> : <path d="M4 6h16 M4 10h10 M4 15h16 M4 19h10" />}
            </svg>
          </button>
        );
      })}
    </>
  );
}

/** Every card setting in one sheet: density, and how one card is told from the next. */
export function CardDisplaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const sep = useDistinction();
  return (
    <Sheet open={open} onClose={onClose} title={t("Affichage des cartes")}>
      <div className={styles.row}>
        <span className={styles.label}>{t("Densité")}</span>
        <span className={`${styles.dens} ${styles.densAll}`} role="group" aria-label={t("Densité des cartes")}>
          <DensityButtons />
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>{t("Distinction entre les cartes")}</span>
        <div className={styles.chips} role="group" aria-label={t("Distinction entre les cartes")}>
          {DISTINCTIONS.map(([k, label]) => (
            <button key={k} type="button" className={`${styles.chip} ${sep === k ? styles.chipOn : ""}`} aria-pressed={sep === k} onClick={() => write(SEP_KEY, k)}>
              {t(label)}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.hint}>{t("Le choix est gardé sur cet appareil, pour les titres et les fonds.")}</p>
    </Sheet>
  );
}

/** The two density icons, phone only, plus the « affichage » button that opens every card setting. */
export function DensitySwitch({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <span className={`${styles.wrap} ${className ?? ""}`}>
      <span className={styles.dens} role="group" aria-label={t("Densité des cartes")}>
        <DensityButtons />
      </span>
      <button type="button" className={styles.more} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={t("Affichage des cartes")} title={t("Affichage des cartes")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h10 M18 7h2 M4 17h4 M12 17h8" />
          <circle cx="16" cy="7" r="2.2" />
          <circle cx="10" cy="17" r="2.2" />
        </svg>
      </button>
      <CardDisplaySheet open={open} onClose={() => setOpen(false)} />
    </span>
  );
}
