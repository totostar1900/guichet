import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { COUNTRY_CODE, type OfferSummary } from "@/lib/domain/summary";
import styles from "./OfferCard.module.css";

/** One number, three facts, one action. Everything else is on the fiche. */
export function OfferCard({ o, s }: { o: Offer; s: OfferSummary }) {
  const href = `/offres/${o.id}`;
  return (
    <article className={`${styles.card} ${s.past ? styles.past : ""}`}>
      <div className={styles.head}>
        <div className={styles.title}>
          <Link href={href}>{s.title}</Link>
          <small>
            <span className="cc" title={o.countryName}>{COUNTRY_CODE[o.country]}</span> {s.kind} · {s.subtitle.split(" · ")[0]}
          </small>
        </div>
        <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : s.status}</span>
      </div>
      <div className={`${styles.big} ${s.gold ? styles.gold : ""}`}>
        {s.hero}
        <small>{s.heroSub}</small>
      </div>
      <div className={styles.facts}>
        {s.facts.map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className={styles.act}>
        {s.primary ? (
          <Link className={`btn sm ${s.primary.intent === "info" ? "" : "primary"}`} href={`${href}?intent=${s.primary.intent}`}>
            {s.primary.label}
          </Link>
        ) : (
          <Link className="btn sm" href={href}>
            Voir la fiche
          </Link>
        )}
        {s.secondary && (
          <Link className="btn sm ghost" href={`${href}?intent=${s.secondary.intent}`}>
            {s.secondary.label}
          </Link>
        )}
        <span className={styles.when}>{s.deadline === "continue" ? "cotation continue" : s.deadline}</span>
      </div>
    </article>
  );
}
