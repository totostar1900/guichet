"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import { doneKey } from "../[key]/Quiz";
import { SectionShape } from "@/components/Illustrations";
import type { Lesson } from "@/data/lessons";
import type { Section } from "@/data/parcours";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/**
 * The five folding sections of the parcours, lettered A to E (their lessons
 * are numbered). One section open at a time: the last one opened, else the
 * first with an unread lesson on the first visit; all five fold. Progress
 * comes from the lessons the reader closed with their question (localStorage).
 */
export const letter = (order: number) => String.fromCharCode(64 + order);
const OPEN_KEY = "guichet:parcours:open";
let listeners: (() => void)[] = [];
const subscribe = (cb: () => void) => {
  listeners.push(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((x) => x !== cb);
    window.removeEventListener("storage", cb);
  };
};
const read = (keys: string[]) => {
  try {
    return JSON.stringify({ open: localStorage.getItem(OPEN_KEY), done: keys.filter((k) => localStorage.getItem(doneKey(k)) === "1") });
  } catch {
    return JSON.stringify({ open: null, done: [] });
  }
};

export function Parcours({ sections, lessons }: { sections: Section[]; lessons: Lesson[] }) {
  const t = useT();
  const keys = lessons.map((l) => l.key);
  const snap = useSyncExternalStore(
    subscribe,
    () => read(keys),
    () => JSON.stringify({ open: null, done: [] }),
  );
  const { open, done } = JSON.parse(snap) as { open: string | null; done: string[] };
  const isDone = (k: string) => done.includes(k);
  const bySection = (s: Section) => lessons.filter((l) => l.section === s.key);
  const firstUnread = sections.find((s) => bySection(s).some((l) => !isDone(l.key)))?.key ?? sections[0].key;
  // "" is a choice too: the reader folded everything; null means never chosen, so the first unread opens.
  const current = open === "" ? null : open && sections.some((s) => s.key === open) ? open : firstUnread;
  const setOpen = useCallback((k: string | null) => {
    try {
      localStorage.setItem(OPEN_KEY, k ?? "");
    } catch {
      // storage unavailable
    }
    listeners.forEach((cb) => cb());
  }, []);
  const total = lessons.length;
  const readCount = done.length;
  const minutesLeft = lessons.filter((l) => !isDone(l.key)).reduce((s, l) => s + l.minutes, 0);
  const shapeColor = (s: Section) => s.color;

  return (
    <>
      <div className={styles.progress} data-coach="parcours-progress">
        <div className={styles.bar} aria-hidden="true">
          {sections.map((s) => {
            const ls = bySection(s);
            const pct = ls.length ? (ls.filter((l) => isDone(l.key)).length / ls.length) * 100 : 0;
            return (
              <div key={s.key} className={styles.seg} style={{ flex: ls.length }}>
                <div className={styles.segFill} style={{ width: `${pct}%`, background: shapeColor(s) }} />
              </div>
            );
          })}
        </div>
        <span>
          <b>{t("{n} leçons lues sur {total}", { n: readCount, total })}</b>
          {minutesLeft > 0 ? ` · ${t("{n} min restantes", { n: minutesLeft })}` : ` · ${t("parcours terminé")}`}
        </span>
      </div>

      {sections.map((s) => {
        const ls = bySection(s);
        const doneN = ls.filter((l) => isDone(l.key)).length;
        const isOpen = current === s.key;
        const next = ls.find((l) => !isDone(l.key));
        return (
          <section key={s.key} id={`section-${s.key}`} className={`${styles.section} ${isOpen ? styles.open : ""}`} data-coach={s.order === 1 ? "parcours-section" : undefined}>
            <button type="button" className={styles.sectionHead} aria-expanded={isOpen} aria-controls={`lessons-${s.key}`} onClick={() => setOpen(isOpen ? null : s.key)}>
              <span className={`${styles.badge} ${doneN === ls.length && ls.length > 0 ? styles.badgeDone : doneN > 0 ? styles.badgeOn : ""}`} style={doneN === ls.length && ls.length > 0 ? { background: shapeColor(s) } : doneN > 0 ? { borderColor: shapeColor(s), color: shapeColor(s) } : undefined}>
                {doneN === ls.length && ls.length > 0 ? "✓" : letter(s.order)}
              </span>
              <SectionShape shape={s.shape} color={shapeColor(s)} size={24} />
              <span className={styles.headText}>
                <b>{t(s.title)}</b>
                <small>
                  {t("{n} leçons", { n: ls.length })} · {ls.reduce((x, l) => x + l.minutes, 0)} min{doneN > 0 ? ` · ${doneN === ls.length ? t("lues") : t("{n} lues", { n: doneN })}` : ""}
                </small>
              </span>
              <span className={styles.keywords}>{t(s.keywords)}</span>
              <span className={`${styles.chev} ${isOpen ? styles.chevOpen : ""}`} aria-hidden="true">
                ›
              </span>
            </button>
            {isOpen && (
              <div id={`lessons-${s.key}`} className={styles.body}>
                <div className={styles.grid}>
                  {ls.map((l, i) => {
                    const d = isDone(l.key);
                    const isNext = next?.key === l.key;
                    return (
                      <Link key={l.key} href={`/info/${l.key}`} className={`${styles.lesson} ${d ? styles.lessonDone : ""} ${isNext ? styles.lessonNext : ""}`}>
                        <i className={styles.num} style={d ? { background: shapeColor(s), borderColor: shapeColor(s), color: "#fff" } : isNext ? { borderColor: shapeColor(s), color: shapeColor(s) } : undefined}>
                          {d ? "✓" : i + 1}
                        </i>
                        <span>
                          <b>{t(l.title)}</b>
                          <small>{t(l.intro)}</small>
                        </span>
                        <em>{isNext ? `${t("Continuer")} →` : `${l.minutes} min`}</em>
                      </Link>
                    );
                  })}
                </div>
                <p className={styles.blurb}>
                  <b>{t("Ce que cette section vous apprend")}</b> : {t(s.blurb)}
                </p>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
