"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useRef } from "react";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { LineIdentity } from "./LineIdentity";
import { LineMenu } from "./mobile/LineMenu";
import { SwipeActions } from "./mobile/SwipeActions";
import { famVars } from "@/lib/registry";
import { useDensity } from "./Density";
import styles from "./OfferCard.module.css";

/**
 * One number, three facts, one action. The « ··· » sits in the corner by
 * the status, « Voir la fiche » at the foot; on the phone the card also
 * pulls to the left for Suivre · Comparer · Plus. Compact (the phone's
 * choice): two lines, the title, then the number with its condition and
 * the date.
 */
export function OfferCard({ o, s }: { o: Offer; s: OfferSummary }) {
  const href = `/offres/${o.id}`;
  const t = useT();
  const compact = useDensity() === "compact";
  const more = useRef<(() => void) | null>(null);
  const when = s.deadline === "continue" ? t("cotation continue") : t(s.deadline);
  return (
    <SwipeActions id={o.id} onMore={() => more.current?.()}>
      <article className={`${styles.card} ${s.past ? styles.past : ""} ${compact ? styles.compact : ""}`} style={{ ["--card-c" as string]: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
        <div className={styles.head}>
          <LineIdentity o={o} s={s} href={href} size="lg" />
          <div className={styles.corner}>
            <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : t(s.status)}</span>
            <LineMenu line={{ id: o.id, title: o.title, isin: o.isin, sub: `${s.subtitle} · ${s.hero} ${s.heroUnit ?? ""}`.trim() }} openRef={more} />
          </div>
        </div>
        <div className={styles.big}>
          <b className={s.gold ? styles.gold : ""}>{s.hero}</b>
          <small>{t(s.heroSub)}</small>
          <span className={styles.whenC}>{when}</span>
        </div>
        <div className={styles.facts}>
          {s.facts.map(([k, v, note]) => (
            <div key={k}>
              <span>{t(k)}</span>
              <b>{v}</b>
              {note && <em>{t(note)}</em>}
            </div>
          ))}
        </div>
        <div className={styles.foot}>
          <span className={styles.when}>{when}</span>
          <Link className="btn sm" href={href}>
            {t("Voir la fiche")} →
          </Link>
        </div>
      </article>
    </SwipeActions>
  );
}
