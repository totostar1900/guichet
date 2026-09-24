"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useDensity } from "@/components/Density";
import { LineMenu } from "@/components/mobile/LineMenu";
import { useDeskView, useLineHref } from "@/components/DeskView";
import { SwipeActions } from "@/components/mobile/SwipeActions";
import { CardBack } from "@/components/mobile/CardBack";
import { fundBackFacts } from "@/lib/domain/back";
import { useMemo, useRef, useState } from "react";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import type { FundRow } from "./FundsBrowser";
import styles from "@/components/OfferCard.module.css";

const signed = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`);
const cls = (v?: number) => (v == null ? "" : v > 0 ? styles.up : v < 0 ? styles.down : "");

/**
 * A fund on the phone, the same shape as a security's card: the fund and
 * who runs it, the NAV large with its date, then twelve months · since
 * inception · change; the « ··· » in the corner, « Voir la fiche » at the
 * foot; pulled left it offers « Déclarer » and « Me rappeler », pulled right
 * it turns over (manager, depositary, NAV rhythm, inception, ISIN). Compact:
 * the fund, the NAV, twelve months.
 */
export function FundCard({ r }: { r: FundRow }) {
  const t = useT();
  const compact = useDensity() === "compact";
  const href = useLineHref()(r.id);
  const desk = useDeskView();
  const [turned, setTurned] = useState(false);
  const more = useRef<(() => void) | null>(null);
  const turn = useRef<(() => void) | null>(null);
  const facts = useMemo(() => fundBackFacts(r), [r]);
  const figures: [string, string, string?][] = [
    ["Société de gestion", r.manager],
    ["Dépositaire", r.depositary],
    ["Depuis l'origine", signed(r.perfSinceInceptionPct), r.inceptionDate ? fmtDate(r.inceptionDate) : undefined],
    ["ISIN", r.isin],
  ];
  return (
    <SwipeActions
      id={r.id}
      turnRef={turn}
      onTurn={setTurned}
      backHead={
        <div className={styles.corner}>
          <span className={`pill ${r.open ? "open" : "quoted"}`}>{t(r.open ? "Souscription ouverte" : "Information")}</span>
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
      back={<CardBack facts={facts} figures={compact ? figures : undefined} curveId={r.id} turned={turned} />}
    >
      <article className={`${styles.card} ${compact ? styles.compact : ""}`} style={{ ["--card-c" as string]: "var(--info)" }}>
        <div className={styles.head}>
          <div className={styles.fundId}>
            <div className={styles.fundTitle}>
              <Link href={href}>{r.title}</Link>
            </div>
            <div className={styles.fundSub}>
              {t(FUND_CATEGORY_LABEL[r.category])} · {t(FUND_FREQUENCY_LABEL[r.frequency])} · {r.manager}
            </div>
            <div className={styles.fundSub}>
              {t("Dépositaire")} : {r.depositary}
            </div>
          </div>
          <div className={styles.corner}>
            <span className={`pill ${r.open ? "open" : "quoted"}`}>{t(r.open ? "Souscription ouverte" : "Information")}</span>
            {!desk && <LineMenu line={{ id: r.id, title: r.title, isin: r.isin, sub: `${r.manager} · VL ${fmt(r.nav)} FCFA` }} openRef={more} />}
            <button type="button" className={styles.flipBtn} onClick={() => turn.current?.()} aria-label={t("Retourner la carte")} title={t("Retourner la carte")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
                <path d="M18 3v4h-4M6 21v-4h4" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.big}>
          <b>VL {fmt(r.nav)}</b>
          <small>
            FCFA · {t("au")} {fmtDate(r.navDate, false)}
          </small>
          <span className={`${styles.whenC} ${cls(r.perf1yPct)}`}>
            {t("12 mois")} {signed(r.perf1yPct)}
          </span>
        </div>
        <div className={styles.facts}>
          <div>
            <span>{t("12 mois")}</span>
            <b className={cls(r.perf1yPct)}>{signed(r.perf1yPct)}</b>
          </div>
          <div>
            <span>{t("Depuis l'origine")}</span>
            <b className={cls(r.perfSinceInceptionPct)}>{signed(r.perfSinceInceptionPct)}</b>
            {r.inceptionDate && <em>{t("depuis le")} {fmtDate(r.inceptionDate)}</em>}
          </div>
          <div>
            <span>{t("Variation")}</span>
            <b className={cls(r.variationPct)}>{signed(r.variationPct)}</b>
          </div>
        </div>
        <div className={styles.foot}>
          <span className={styles.when}>{t(r.open ? "prochaine VL : souscription possible" : "non distribué : dites-nous votre intérêt")}</span>
          <Link className="btn sm" href={href}>
            {t("Voir la fiche")} →
          </Link>
        </div>
      </article>
    </SwipeActions>
  );
}
