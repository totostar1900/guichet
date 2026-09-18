"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./InfoSearch.module.css";

/**
 * The support box of the Info tab: one field, every word, notion, lesson,
 * tool or page of the app behind it. Results rank title matches first, show
 * the sentence where the word appears, and Enter opens the first one.
 */
export interface SearchEntry {
  kind: "terme" | "lecon" | "outil" | "page";
  title: string;
  text: string;
  href: string;
  extra?: string; // aliases (« OTA », « VL ») that should also match
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'");

function snippet(text: string, words: string[]): string {
  const f = fold(text);
  let at = -1;
  for (const w of words) {
    const i = f.indexOf(w);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return text.slice(0, 140) + (text.length > 140 ? "…" : "");
  const prev = f.lastIndexOf(". ", at);
  const start = prev < 0 ? 0 : prev + 2;
  const end = f.indexOf(". ", at);
  const s = text.slice(start, end > 0 ? end + 1 : Math.min(text.length, at + 160));
  return s.length > 200 ? s.slice(0, 200) + "…" : s;
}

export function InfoSearch({ entries }: { entries: SearchEntry[] }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const KIND: Record<SearchEntry["kind"], string> = { terme: t("Mot du Guichet"), lecon: t("Leçon"), outil: t("Outil"), page: t("Page") };

  const results = useMemo(() => {
    const words = fold(q).split(/\s+/).filter((w) => w.length >= 2);
    if (words.length === 0) return [];
    return entries
      .map((e) => {
        const title = fold(e.title + " " + (e.extra ?? ""));
        const body = fold(e.text);
        let score = 0;
        for (const w of words) {
          if (title === w || title.split(/[^a-z0-9]+/).includes(w)) score += 10;
          else if (title.includes(w)) score += 6;
          if (body.includes(w)) score += 2;
        }
        if (words.every((w) => !title.includes(w) && !body.includes(w))) score = 0;
        return { e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title, "fr"))
      .slice(0, 8)
      .map((x) => ({ ...x, words }));
  }, [q, entries]);

  const go = (href: string) => {
    setQ("");
    router.push(href);
  };

  return (
    <div className={styles.wrap} ref={box}>
      <label className={styles.field}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          placeholder={t("Un mot, une notion, une leçon, un outil… ex. coupon couru, adjudication, VL, relevé")}
          aria-label={t("Rechercher dans l'aide")}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              go(results[active].e.href);
            } else if (e.key === "Escape") setQ("");
          }}
        />
      </label>
      {q.trim().length >= 2 && (
        <div className={styles.results} role="listbox">
          {results.map(({ e, words }, i) => (
            <button key={e.href + e.title} type="button" role="option" aria-selected={i === active} className={`${styles.item} ${i === active ? styles.on : ""}`} onMouseEnter={() => setActive(i)} onClick={() => go(e.href)}>
              <span className={`${styles.kind} ${styles[e.kind]}`}>{KIND[e.kind]}</span>
              <span className={styles.body}>
                <b>{e.title}</b>
                <small>{snippet(e.text, words)}</small>
              </span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <div className={styles.empty}>
              {t("Rien trouvé pour")} « {q} ». {t("Posez la question au desk depuis n'importe quelle fiche (bouton « Question ») ou sur WhatsApp.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
