"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

export const doneKey = (key: string) => `guichet:lesson:${key}`;

/** One question closes the lesson; a right answer marks it done on this device. */
export function Quiz({ lessonKey, q, options, answer, why, nextHref, nextTitle }: { lessonKey: string; q: string; options: string[]; answer: number; why: string; nextHref?: string; nextTitle?: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    // Read after mount (the server never knows the device), outside the render pass.
    const t = setTimeout(() => {
      try {
        setDone(localStorage.getItem(doneKey(lessonKey)) === "1");
      } catch {
        // storage unavailable
      }
    }, 0);
    return () => clearTimeout(t);
  }, [lessonKey]);
  const pick = (i: number) => {
    setPicked(i);
    if (i === answer) {
      setDone(true);
      try {
        localStorage.setItem(doneKey(lessonKey), "1");
      } catch {
        // storage unavailable
      }
    }
  };
  const tr = useT();
  return (
    <div className={styles.quiz}>
      <div className="eyebrow">{tr("Une question pour finir")}{done ? ` · ${tr("acquis")} ✓` : ""}</div>
      <p className={styles.q}>{q}</p>
      {options.map((o, i) => (
        <button key={i} type="button" className={`${styles.opt} ${picked === i ? (i === answer ? styles.ok : styles.ko) : ""}`} onClick={() => pick(i)} aria-pressed={picked === i}>
          {o}
        </button>
      ))}
      {picked != null && <p className={`${styles.why} ${picked === answer ? styles.okTxt : styles.koTxt}`}>{picked === answer ? `${tr("Exact.")} ${why}` : `${tr("Pas tout à fait.")} ${why}`}</p>}
      {picked === answer && nextHref && (
        <Link className="btn primary" href={nextHref}>
          {tr("Leçon suivante :")} {nextTitle} →
        </Link>
      )}
    </div>
  );
}

/** Small check mark on the lesson list, read from the device. */
export function DoneMark({ lessonKey }: { lessonKey: string }) {
  const tr = useT();
  const [done, setDone] = useState(false);
  useEffect(() => {
    // Read after mount (the server never knows the device), outside the render pass.
    const t = setTimeout(() => {
      try {
        setDone(localStorage.getItem(doneKey(lessonKey)) === "1");
      } catch {
        // storage unavailable
      }
    }, 0);
    return () => clearTimeout(t);
  }, [lessonKey]);
  return done ? (
    <span className={styles.done} aria-label={tr("acquis")}>
      ✓
    </span>
  ) : null;
}
