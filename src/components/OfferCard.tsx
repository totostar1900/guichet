import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { LineIdentity } from "./LineIdentity";
import { famVars } from "@/lib/registry";
import styles from "./OfferCard.module.css";

/** One number, three facts, one action. Everything else is on the fiche. */
export function OfferCard({ o, s }: { o: Offer; s: OfferSummary }) {
  const href = `/offres/${o.id}`;
  return (
    <article className={`${styles.card} ${s.past ? styles.past : ""}`} style={{ borderTopColor: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
      <div className={styles.head}>
        <LineIdentity o={o} s={s} href={href} size="lg" />
        <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : s.status}</span>
      </div>
      <div className={styles.big}>
        <b className={s.gold ? styles.gold : ""}>{s.hero}</b>
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
        <Link className="btn sm" href={href}>
          Voir la fiche
        </Link>
        <span className={styles.when}>
          {s.deadline === "continue" ? "cotation continue" : s.deadline}
        </span>
      </div>
    </article>
  );
}
