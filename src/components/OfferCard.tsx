"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useRef } from "react";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { LineIdentity } from "./LineIdentity";
import { LineMenu } from "./mobile/LineMenu";
import { famVars } from "@/lib/registry";
import styles from "./OfferCard.module.css";

/** One number, three facts, one action. Everything else is on the fiche (or in the « ··· », also opened by a long press). */
export function OfferCard({ o, s }: { o: Offer; s: OfferSummary }) {
  const href = `/offres/${o.id}`;
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  return (
    <article ref={ref} className={`${styles.card} ${s.past ? styles.past : ""}`} style={{ borderTopColor: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
      <div className={styles.head}>
        <LineIdentity o={o} s={s} href={href} size="lg" />
        <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : t(s.status)}</span>
      </div>
      <div className={styles.big}>
        <b className={s.gold ? styles.gold : ""}>{s.hero}</b>
        <small>{t(s.heroSub)}</small>
      </div>
      <div className={styles.facts}>
        {s.facts.map(([k, v]) => (
          <div key={k}>
            <span>{t(k)}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className={styles.act}>
        <Link className="btn sm" href={href}>
          {t("Voir la fiche")}
        </Link>
        <LineMenu line={{ id: o.id, title: o.title, isin: o.isin, sub: `${s.subtitle} · ${s.hero} ${s.heroUnit ?? ""}`.trim() }} pressOn={ref} />
        <span className={styles.when}>
          {s.deadline === "continue" ? t("cotation continue") : t(s.deadline)}
        </span>
      </div>
    </article>
  );
}
