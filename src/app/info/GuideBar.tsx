"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rankEntries, type SearchEntry } from "./InfoSearch";
import { Sheet } from "@/components/mobile/Sheet";
import { useT } from "@/i18n/client";
import type { GuideIndex } from "@/lib/guide-index-shared";
import { cachedGuideIndex, loadGuideIndex, readDoneLessons } from "@/lib/guide-index-client";
import styles from "./GuideBar.module.css";

/**
 * On the phone, every page of the Guide carries the same navy bar above the
 * tabs: the sommaire (a sheet: search, the two courses with their progress,
 * the tools), where the reader is, and the previous / next lesson. On a desk
 * the sticky left nav does that job; the bar stays hidden there.
 */
export interface GuidePos {
  label: string; // "F · 4 / 8", "Le Guide", "Aide"
  done?: number; // lessons read in the current course
  total?: number;
  index?: number; // the current lesson, 1-based
}

export function GuideBar({ pos, prev, next, here }: { pos: GuidePos; prev?: { href: string; title: string }; next?: { href: string; title: string }; here?: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<GuideIndex | null>(cachedGuideIndex());
  const [done, setDone] = useState<string[]>([]);
  const show = () => {
    setOpen(true);
    setQ("");
    loadGuideIndex().then((i) => {
      setIndex(i);
      setDone(readDoneLessons(i.lessons.map((l) => l.key)));
    });
  };
  const close = () => setOpen(false);
  const goTo = (e: SearchEntry) => {
    close();
    router.push(e.href);
  };
  const hits = index && q.trim().length >= 2 ? rankEntries(index.entries, q, 6).results.map((r) => r.e) : [];
  const first = index?.lessons.filter((l) => !l.section) ?? [];
  const course = index?.lessons.filter((l) => l.section) ?? [];
  const count = (keys: string[]) => keys.filter((k) => done.includes(k)).length;
  const firstDone = count(first.map((l) => l.key));
  const courseDone = count(course.map((l) => l.key));
  const resume = course.find((l) => !done.includes(l.key));
  const ticks = pos.total ? Array.from({ length: pos.total }, (_, i) => i + 1) : [];

  return (
    <>
      <div className={styles.bar} role="navigation" aria-label={t("Le Guide")}>
        <button type="button" className={styles.sommaire} onClick={show} aria-haspopup="dialog" aria-label={t("Sommaire du Guide")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
        <div className={styles.pos}>
          <small>{pos.label}</small>
          {ticks.length > 0 && (
            <span className={styles.ticks} aria-hidden="true">
              {ticks.map((i) => (
                <i key={i} className={i === pos.index ? styles.tickHere : i <= (pos.done ?? 0) ? styles.tickDone : undefined} />
              ))}
            </span>
          )}
        </div>
        <div className={styles.arrows}>
          {prev ? (
            <Link href={prev.href} className={styles.prev} aria-label={`${t("Leçon précédente")} : ${prev.title}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </Link>
          ) : (
            <span className={`${styles.prev} ${styles.off}`} aria-hidden="true" />
          )}
          {next ? (
            <Link href={next.href} className={styles.next} aria-label={`${t("Leçon suivante")} : ${next.title}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span className={`${styles.next} ${styles.off}`} aria-hidden="true" />
          )}
        </div>
      </div>

      <Sheet open={open} onClose={close} navy title={t("Le Guide")} sub={index ? t("{n} leçons lues sur {total}", { n: firstDone + courseDone, total: index.lessons.length }) : undefined}>
        <div className={styles.sheet}>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Un mot, une question…")} aria-label={t("Rechercher dans le Guide")} autoComplete="off" enterKeyHint="search" onKeyDown={(e) => e.key === "Enter" && hits[0] && goTo(hits[0])} />
          </label>
          {q.trim().length >= 2 && (
            <div className={styles.hits}>
              {hits.length === 0 && <span className={styles.none}>{index ? t("Aucun résultat") : t("Un instant…")}</span>}
              {hits.map((e) => (
                <button key={e.href + e.title} type="button" className={styles.hit} onClick={() => goTo(e)}>
                  <em>{t(e.kind === "terme" ? "Définition" : e.kind === "lecon" ? "Leçon" : e.kind === "outil" ? "Outil" : "Aide")}</em>
                  <b>{e.title}</b>
                </button>
              ))}
            </div>
          )}

          <Link href="/info#lecons" className={styles.row} onClick={close}>
            <i className={styles.num}>8</i>
            <b>{t("Lire une ligne en trente secondes")}</b>
            <small className={index && firstDone === first.length && first.length > 0 ? styles.ok : undefined}>{index ? `${firstDone} / ${first.length}${firstDone === first.length && first.length > 0 ? " ✓" : ""}` : ""}</small>
          </Link>
          <div className={styles.rowHead}>
            <b>{t("Comprendre le marché CEMAC")}</b>
            <small>{index ? `${courseDone} / ${course.length}` : ""}</small>
          </div>
          {index?.sections.map((s) => {
            const ls = course.filter((l) => l.section === s.key);
            const d = count(ls.map((l) => l.key));
            const isHere = here === s.key;
            const target = ls.find((l) => !done.includes(l.key)) ?? ls[0];
            return (
              <Link key={s.key} href={target ? `/info/${target.key}` : "/info/parcours"} className={`${styles.section} ${isHere ? styles.sectionHere : ""}`} style={{ borderLeftColor: s.color }} onClick={close}>
                <span>
                  {String.fromCharCode(64 + s.order)} · {s.title}
                </span>
                <small className={d === ls.length && ls.length > 0 ? styles.ok : isHere ? styles.hereWord : undefined}>
                  {isHere ? `${t("ici")} · ` : ""}
                  {d} / {ls.length}
                </small>
              </Link>
            );
          })}
          {!index && <span className={styles.none}>{t("Un instant…")}</span>}
          {resume && index && (
            <Link href={`/info/${resume.key}`} className={styles.resume} onClick={close}>
              {t("Reprendre")} : {resume.title} →
            </Link>
          )}
          <div className={styles.tools}>
            <Link href="/info#simulateur" onClick={close}>
              {t("Simulateur d'obligation")}
            </Link>
            <Link href="/comparer" onClick={close}>
              {t("Comparer deux lignes")}
            </Link>
            <Link href="/info#glossaire" onClick={close}>
              {t("Les mots du Guichet")}
            </Link>
            <Link href="/info/aide" onClick={close}>
              {t("Aide")} · {t("Mentions")}
            </Link>
          </div>
        </div>
      </Sheet>
    </>
  );
}
