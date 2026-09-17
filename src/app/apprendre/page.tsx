import Link from "next/link";
import { loadLessons } from "@/lib/reference";
import { getRegistry } from "@/lib/registry";
import { DoneMark } from "./[key]/Quiz";
import { ReplayOnboarding } from "@/components/mobile/Onboarding";
import styles from "./page.module.css";

export const metadata = { title: "Apprendre" };

/**
 * The learning tab: where a first-time investor starts. Today it gathers what
 * already exists (simulator, glossary, companies, issuers, comparer); the
 * lessons and the guided tour arrive in the next step.
 */
export default async function ApprendrePage() {
  const G = getRegistry().glossary;
  const lessons = await loadLessons();
  const keys = Object.keys(G).sort((a, b) => G[a].short.localeCompare(G[b].short, "fr"));
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className="eyebrow">Apprendre</div>
        <h1 className="display">Lire une ligne en trente secondes</h1>
        <p className="muted">Ce qu&apos;il faut savoir pour comprendre une offre du Guichet : les mots, les chiffres, les risques — expliqués une fois pour toutes, sans jargon inutile.</p>
      </div>

      <div className={styles.lessons}>
        <div className={styles.lessonsHead}>
          <h2 className={styles.h2}>Huit leçons courtes</h2>
          <ReplayOnboarding />
        </div>
        {lessons.map((l) => (
          <Link key={l.key} href={`/apprendre/${l.key}`} className={styles.lesson}>
            <i>{l.order}</i>
            <span>
              <b>{l.title}</b>
              <small>{l.intro}</small>
            </span>
            <em>
              <DoneMark lessonKey={l.key} /> {l.minutes} min
            </em>
          </Link>
        ))}
      </div>

      <h2 className={styles.h2}>Outils et repères</h2>
      <div className={styles.grid}>
        <Link href="/simulateur" className={styles.tile}>
          <span className={styles.k}>Outil</span>
          <b>Simulateur d&apos;obligation</b>
          <span>Comment le prix, le coupon et la durée fabriquent le rendement. Faites varier, regardez.</span>
        </Link>
        <Link href="/comparer" className={styles.tile}>
          <span className={styles.k}>Outil</span>
          <b>Comparer deux lignes</b>
          <span>Deux offres côte à côte : rendement, durée, ticket, calendrier.</span>
        </Link>
        <Link href="/societes" className={styles.tile}>
          <span className={styles.k}>Repères</span>
          <b>Sociétés cotées et émetteurs</b>
          <span>Comptes, dividendes, actionnariat, documents publiés à la BVMAC.</span>
        </Link>
      </div>

      <h2 className={styles.h2}>Les mots du Guichet</h2>
      <div className={styles.gloss}>
        {keys.map((k) => (
          <div key={k} id={`terme-${k}`}>
            <b>{G[k].long ? `${G[k].short} — ${G[k].long}` : G[k].short}</b>
            <p>{G[k].text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
