import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { summarize } from "@/lib/domain/summary";
import { famVars } from "@/lib/registry";
import styles from "./FeaturedStrip.module.css";

/**
 * « À la une » — the desk's selection (max three), above the list. A phone
 * swipes them, a desktop reads them as a band. Each card carries the neutral
 * reason the desk gave; the figures are the line's own.
 */
export function FeaturedStrip({ offers, nowIso }: { offers: Offer[]; nowIso: string }) {
  const now = new Date(nowIso);
  const today = nowIso.slice(0, 10);
  const picks = offers
    .filter((o) => o.featured && o.featured.until >= today && !o.hidden)
    .sort((a, b) => (a.featured!.at < b.featured!.at ? 1 : -1))
    .slice(0, 3);
  if (picks.length === 0) return null;
  return (
    <section className={styles.strip} aria-label="À la une">
      <div className={styles.head}>
        <span className="eyebrow">À la une · sélection du desk</span>
        <small>Une sélection, pas un conseil : chaque ligne se lit dans sa fiche.</small>
      </div>
      <div className={styles.cards}>
        {picks.map((o) => {
          const s = summarize(o, now);
          return (
            <Link key={o.id} href={`/offres/${o.id}`} className={styles.card} style={{ ["--edge" as string]: famVars(s.family)["--fam-c"] ?? "var(--gold)" } as React.CSSProperties}>
              <div className={styles.top}>
                <span className={`fam fam-${s.family}`} style={famVars(s.family) as React.CSSProperties}>
                  {s.kind}
                </span>
                <span className={`pill ${s.statusClass}`}>{s.countdown ? `Clôture ${s.countdown}` : s.status}</span>
              </div>
              <b className={styles.title}>{s.title}</b>
              <div className={styles.hero}>
                <b className={s.gold ? styles.gold : undefined}>{s.hero}</b>
                <small>{s.heroUnit ?? s.heroSub}</small>
              </div>
              <div className={styles.reason}>{o.featured!.reason}</div>
              <div className={styles.facts}>
                {s.facts.slice(0, 2).map(([k, v]) => (
                  <span key={k}>
                    {k} <b>{v}</b>
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
