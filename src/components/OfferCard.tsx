"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { LineIdentity } from "./LineIdentity";
import { LineMenu } from "./mobile/LineMenu";
import { useDeskView, useLineHref } from "./DeskView";
import { SwipeActions } from "./mobile/SwipeActions";
import { CardBack } from "./mobile/CardBack";
import { backFacts } from "@/lib/domain/back";
import { useMemo, useRef } from "react";
import { famVars } from "@/lib/registry";
import { useDensity } from "./Density";
import styles from "./OfferCard.module.css";

/**
 * One number, three facts, one action. The « ··· » sits in the corner by
 * the status, « Voir la fiche » at the foot; on the phone the card pulls
 * left for « Déclarer » and « Me rappeler », and turns over (a pull to the
 * right) to show the four figures of the list, the ISIN and the closing.
 * Compact (the phone's choice): two lines, the title, then the number
 * with its condition and the date.
 */
export function OfferCard({ o, s }: { o: Offer; s: OfferSummary }) {
  const href = useLineHref()(o.id);
  const desk = useDeskView();
  const t = useT();
  const compact = useDensity() === "compact";
  // « Clôture · jeu. 15 oct. 17 h 00 » on the card's foot; a listed line reads « cotation continue ».
  const continuous = s.deadline === "continue";
  const when = continuous ? t("cotation continue") : t(s.deadline);
  const whenLabel = continuous || !when ? null : <em className={styles.whenLabel}>{t("Clôture")}</em>;
  const more = useRef<(() => void) | null>(null);
  const turn = useRef<(() => void) | null>(null);
  const facts = useMemo(() => backFacts(o, new Date()), [o]);
  return (
    <SwipeActions
      id={o.id}
      turnRef={turn}
      backHead={
        <div className={styles.corner}>
          <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : t(s.status)}</span>
          <button type="button" className={styles.dotsBack} onClick={() => more.current?.()} aria-label={t("Plus d'actions")}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          <button type="button" className={styles.flipBtn} data-recto aria-label={t("Recto")} title={t("Recto")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
              <path d="M18 3v4h-4M6 21v-4h4" />
            </svg>
          </button>
        </div>
      }
      back={<CardBack facts={facts} figures={compact ? s.ledger.slice(1) : undefined} />}
    >
      <article className={`${styles.card} ${s.past ? styles.past : ""} ${compact ? styles.compact : ""}`} style={{ ["--card-c" as string]: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
        <div className={styles.head}>
          <LineIdentity o={o} s={s} href={href} size="lg" />
          <div className={styles.corner}>
            <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : t(s.status)}</span>
            {!desk && <LineMenu line={{ id: o.id, title: o.title, isin: o.isin, sub: `${s.subtitle} · ${s.hero} ${s.heroUnit ?? ""}`.trim() }} openRef={more} />}
            <button type="button" className={styles.flipBtn} onClick={() => turn.current?.()} aria-label={t("Retourner la carte")} title={t("Retourner la carte")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
                <path d="M18 3v4h-4M6 21v-4h4" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.big}>
          <b className={s.gold ? styles.gold : ""}>{s.hero}</b>
          <small>{t(s.heroSub)}</small>
          <span className={styles.whenC}>
            {whenLabel}
            {when}
          </span>
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
          <span className={styles.when}>
            {whenLabel}
            {when}
          </span>
          <Link className="btn sm" href={href}>
            {t("Voir la fiche")} →
          </Link>
        </div>
      </article>
    </SwipeActions>
  );
}
