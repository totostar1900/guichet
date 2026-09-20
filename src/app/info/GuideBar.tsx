"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { rankEntries, type SearchEntry } from "./InfoSearch";
import { Sheet } from "@/components/mobile/Sheet";
import { useT } from "@/i18n/client";
import type { GuideIndex, LessonSummary } from "@/lib/guide-index-shared";
import { cachedGuideIndex, loadGuideIndex, readDoneLessons } from "@/lib/guide-index-client";
import styles from "./GuideBar.module.css";

/**
 * On the phone, every page of the Guide carries one capsule in the
 * bottom-right corner, above the tabs. From a lesson it has two halves: the
 * chapter's pastille (its letter in its colour, the ring of the chapter's
 * progress, « 4 / 8 ») and the sommaire; both open the same sheet, on the tab
 * that goes with them (« Ce chapitre » with the reader's place and the
 * chapter's lessons, « Tout le Guide » with the search, the courses and the
 * tools). Elsewhere in the Guide the capsule is the sommaire alone and the
 * sheet opens without tabs, « Vous êtes ici » in words. While the page scrolls
 * the capsule folds onto the pastille. On a desk the sticky left nav does all
 * that; the capsule stays hidden there.
 */
export interface GuidePos {
  label: string; // "F · 4 / 8", "Le Guide", "Aide"
  index?: number; // the current lesson, 1-based
  total?: number;
}
export interface GuideChapter {
  key?: string; // the section's key; none for the first course (« Lire une ligne »)
  letter: string; // "F", or the lesson's number in the first course
  color: string;
  title: string;
}

type Tab = "chapitre" | "guide";

/** The chapter's ring: the letter, the progress as an arc, the place under it. */
function Ring({ letter, color, done, total, place, size = 48 }: { letter: string; color: string; done: number; total: number; place?: string; size?: number }) {
  const r = size * 0.4;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" className={styles.ring}>
      <circle cx={size / 2} cy={size / 2} r={r} className={styles.ringTrack} />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} className={styles.ringArc} />
      <text x={size / 2} y={place ? size * 0.46 : size * 0.6} textAnchor="middle" fontSize={size * 0.3} fontWeight="800" fill={color}>
        {letter}
      </text>
      {place && (
        <text x={size / 2} y={size * 0.7} textAnchor="middle" fontSize={size * 0.17} className={styles.ringPlace}>
          {place}
        </text>
      )}
    </svg>
  );
}

export function GuideBar({ pos, prev, next, chapter, lessonKey }: { pos: GuidePos; prev?: { href: string; title: string }; next?: { href: string; title: string }; chapter?: GuideChapter; lessonKey?: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("guide");
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<GuideIndex | null>(cachedGuideIndex());
  const [done, setDone] = useState<string[]>([]);
  const [folded, setFolded] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  // The ring at rest needs the chapter's progress: the index, once (cached after the first page).
  useEffect(() => {
    let live = true;
    loadGuideIndex().then((i) => {
      if (!live) return;
      setIndex(i);
      setDone(readDoneLessons(i.lessons.map((l) => l.key)));
    });
    return () => {
      live = false;
    };
  }, [lessonKey]);

  // While the page scrolls the capsule folds onto the pastille; it reopens once the scrolling stops.
  const hasChapter = Boolean(chapter);
  useEffect(() => {
    if (!hasChapter) return;
    let timer = 0;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > last + 2;
      last = y;
      if (down) setFolded(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setFolded(false), 900);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [hasChapter]);

  const show = (on: Tab) => {
    setTab(on);
    setQ("");
    setOpen(true);
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
  const count = (ls: LessonSummary[]) => ls.filter((l) => done.includes(l.key)).length;
  const firstDone = count(first);
  const courseDone = count(course);
  const resume = course.find((l) => !done.includes(l.key));
  // The chapter's lessons: the section's, or the first course's.
  const mine = chapter ? (chapter.key ? course.filter((l) => l.section === chapter.key) : first) : [];
  const mineDone = count(mine);
  const mineLeft = mine.filter((l) => !done.includes(l.key)).reduce((s, l) => s + l.minutes, 0);
  const total = pos.total ?? mine.length;
  const place = pos.index && total ? `${pos.index} / ${total}` : undefined;
  const tabs = chapter
    ? [
        { key: "chapitre", label: (<><Ring letter="" color={chapter.color} done={mineDone} total={total} size={20} />{t("Ce chapitre")}</>), on: tab === "chapitre", pick: () => setTab("chapitre") },
        { key: "guide", label: (<><svg viewBox="0 0 24 24" className={styles.tabIcon}><path d="M4 7h16M4 12h16M4 17h10" /></svg>{t("Tout le Guide")}</>), on: tab === "guide", pick: () => setTab("guide") },
      ]
    : undefined;
  // A horizontal swipe in the body moves between the two tabs; a vertical one scrolls as usual.
  const onTouchStart = (e: React.TouchEvent) => {
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!swipe.current || !tabs) return;
    const dx = e.changedTouches[0].clientX - swipe.current.x;
    const dy = e.changedTouches[0].clientY - swipe.current.y;
    swipe.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setTab(dx < 0 ? "guide" : "chapitre");
  };
  const foot =
    prev || next ? (
      <div className={styles.foot}>
        {prev ? (
          <Link href={prev.href} className={styles.prev} onClick={close}>
            ‹ {t("Précédente")}
          </Link>
        ) : (
          <span className={`${styles.prev} ${styles.off}`}>‹ {t("Précédente")}</span>
        )}
        {next ? (
          <Link href={next.href} className={styles.next} onClick={close}>
            {t("Suivante")} ›
          </Link>
        ) : (
          <span className={`${styles.next} ${styles.off}`}>{t("Suivante")} ›</span>
        )}
      </div>
    ) : undefined;

  return (
    <>
      <div className={`${styles.corner} ${chapter ? styles.double : ""} ${folded ? styles.folded : ""}`} role="navigation" aria-label={t("Le Guide")}>
        {chapter && (
          <button type="button" className={styles.pastille} onClick={() => show("chapitre")} aria-haspopup="dialog" aria-label={`${t("Ce chapitre")} : ${chapter.letter} · ${chapter.title}${place ? `, ${t("leçon {n} sur {total}", { n: pos.index ?? 0, total })}` : ""}`}>
            <Ring letter={chapter.letter} color={chapter.color} done={mineDone} total={total} place={place} />
            <span className={styles.badge} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </span>
          </button>
        )}
        <button type="button" className={styles.sommaire} onClick={() => show("guide")} aria-haspopup="dialog" aria-label={t("Sommaire du Guide")} tabIndex={folded ? -1 : 0}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
      </div>

      <Sheet open={open} onClose={close} navy tall={Boolean(chapter)} title={t("Le Guide")} sub={index ? t("{n} leçons lues sur {total}", { n: firstDone + courseDone, total: index.lessons.length }) : undefined} tabs={tabs} foot={foot}>
        <div className={styles.sheet} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {chapter && tab === "chapitre" && (
            <>
              <div className={styles.here} style={{ borderLeftColor: chapter.color }}>
                <Ring letter={chapter.letter} color={chapter.color} done={mineDone} total={total} place={index ? `${mineDone} / ${total}` : undefined} size={64} />
                <span>
                  <small className={styles.hereEyebrow}>{t("Vous êtes ici")}</small>
                  <b>
                    {t("Guide")} › {chapter.key ? `${t("Comprendre le marché")} › ${chapter.letter} · ` : ""}
                    {chapter.title}
                  </b>
                  <small>
                    {place && t("leçon {n} sur {total}", { n: pos.index ?? 0, total })}
                    {index ? ` · ${t("{n} / {total} lues", { n: mineDone, total })}` : ""}
                    {index && mineLeft > 0 ? ` · ${t("{m} min restantes", { m: mineLeft })}` : ""}
                  </small>
                </span>
              </div>
              <ol className={styles.lessons} style={{ borderLeftColor: chapter.color }}>
                {mine.map((l, k) => {
                  const isHere = l.key === lessonKey;
                  const isDone = done.includes(l.key);
                  return (
                    <li key={l.key}>
                      <Link href={`/info/${l.key}`} className={`${styles.lesson} ${isHere ? styles.lessonHere : isDone ? styles.lessonDone : ""}`} onClick={close} aria-current={isHere ? "page" : undefined}>
                        <i style={isDone || isHere ? { borderColor: chapter.color, background: isDone && !isHere ? chapter.color : undefined, color: isHere ? chapter.color : undefined } : undefined}>{isDone && !isHere ? "✓" : k + 1}</i>
                        <span>{l.title}</span>
                        {isHere && <small>{t("ici")}</small>}
                      </Link>
                    </li>
                  );
                })}
                {!index && <li className={styles.none}>{t("Un instant…")}</li>}
              </ol>
            </>
          )}

          {(!chapter || tab === "guide") && (
            <>
              {!chapter && (
                <div className={styles.hereLine}>
                  <small className={styles.hereEyebrow}>{t("Vous êtes ici")}</small>
                  <b>{t(pos.label)}</b>
                </div>
              )}
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

              <Link href="/info#lecons" className={`${styles.row} ${chapter && !chapter.key ? styles.sectionHere : ""}`} onClick={close}>
                <i className={styles.num}>8</i>
                <b>{t("Lire une ligne en trente secondes")}</b>
                <small className={index && firstDone === first.length && first.length > 0 ? styles.ok : chapter && !chapter.key ? styles.hereWord : undefined}>
                  {chapter && !chapter.key ? `${t("ici")} · ` : ""}
                  {index ? `${firstDone} / ${first.length}${firstDone === first.length && first.length > 0 ? " ✓" : ""}` : ""}
                </small>
              </Link>
              <div className={styles.rowHead}>
                <b>{t("Comprendre le marché CEMAC")}</b>
                <small>{index ? `${courseDone} / ${course.length}` : ""}</small>
              </div>
              {index?.sections.map((s) => {
                const ls = course.filter((l) => l.section === s.key);
                const d = count(ls);
                const isHere = chapter?.key === s.key;
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
              {resume && index && !chapter && (
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
                  {t("Aide : vos questions, nos réponses")}
                </Link>
              </div>
              <Link href="/info/mentions" className={styles.legal} onClick={close}>
                {t("Mentions et responsabilités")}
              </Link>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
