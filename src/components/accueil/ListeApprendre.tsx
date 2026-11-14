"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { doneKey } from "@/app/info/[key]/Quiz";
import styles from "./BlocApprendre.module.css";

export interface EclairageDeLAccueil {
  key: string;
  order: number;
  titre: string;
  phrase: string;
  minutes: number;
}

/** Combien d'éclairages le bloc montre : trois, comme la planche 3A. */
export const NB_ECLAIRAGES_ACCUEIL = 3;

/** Les premiers éclairages non lus, dans leur ordre ; vide quand tout est lu (la pièce se tait alors). */
export function premiersNonLus<T extends { key: string }>(lessons: T[], lus: ReadonlySet<string> | null, n = NB_ECLAIRAGES_ACCUEIL): T[] {
  return lessons.filter((l) => !lus?.has(l.key)).slice(0, n);
}

/**
 * Les trois premiers éclairages NON LUS, et rien quand tout est lu. Avant que l'appareil réponde, la liste des trois premiers est montrée : un bloc qui apparaîtrait
 * après coup ferait sauter la page, et un lecteur qui a tout lu est rare.
 */
export function ListeApprendre({ entete, lessons, min }: { entete: ReactNode; lessons: EclairageDeLAccueil[]; min: string }) {
  const [lus, setLus] = useState<Set<string> | null>(null);
  useEffect(() => {
    /* Lu après le montage (le serveur ne connaît pas l'appareil), hors du rendu. */
    const attente = setTimeout(() => {
      try {
        setLus(new Set(lessons.filter((l) => localStorage.getItem(doneKey(l.key)) === "1").map((l) => l.key)));
      } catch {
        setLus(new Set());
      }
    }, 0);
    return () => clearTimeout(attente);
  }, [lessons]);

  const restants = premiersNonLus(lessons, lus);
  if (restants.length === 0) return null;
  return (
    <section className={styles.bloc} aria-labelledby="apprendre">
      {entete}
      <ul className={styles.liste}>
        {restants.map((l) => (
          <li key={l.key}>
            <Link href={`/info/${l.key}`} className={styles.ligne}>
              <i className={styles.numero}>{l.order}</i>
              <span className={styles.texte}>
                <b>{l.titre}</b>
                <small>{l.phrase}</small>
              </span>
              <em className={styles.duree}>
                {l.minutes} {min}
              </em>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
