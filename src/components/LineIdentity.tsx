"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { COUNTRY_CODE, type OfferSummary } from "@/lib/domain/summary";
import { famVars } from "@/lib/registry";
import styles from "./LineIdentity.module.css";

/**
 * How a line introduces itself, the same in the table, the list and the cards:
 * the instrument name, then who issues it (family badge · country · issuer ·
 * operation), then the ISIN in monospace for bank orders.
 */
export function LineIdentity({ o, s, href, size = "md", as: Tag = "div" }: { o: Offer; s: OfferSummary; href?: string; size?: "md" | "lg" | "xl"; as?: "div" | "h1" }) {
  const t = useT();
  const title = href ? <Link href={href}>{s.title}</Link> : s.title;
  return (
    <div className={`${styles.id} ${size === "lg" ? styles.lg : size === "xl" ? styles.xl : ""}`}>
      <Tag className={styles.title}>{title}</Tag>
      <div className={styles.meta}>
        <span className={`fam fam-${s.family}`} style={famVars(s.family) as React.CSSProperties}>
          {s.kind}
        </span>
        <span className="cc" title={t(o.countryName)}>
          {COUNTRY_CODE[o.country]}
        </span>
        <span className={styles.isin}>{o.isin}</span>
        <span className={styles.issuer}>{t(s.subtitle)}</span>
      </div>
      {s.badges.length > 0 && (
        <div className={styles.badges}>
          {s.badges.map((b) => (
            <span key={b.key} className={`${styles.badge} ${styles[b.key]}`} title={b.note}>
              {t(b.label)}
              {b.note && b.key !== "cloture" ? <em> · {t(b.note)}</em> : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
