import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { COUNTRY_CODE, type OfferSummary } from "@/lib/domain/summary";
import styles from "./LineIdentity.module.css";

/**
 * How a line introduces itself, the same in the table, the list and the cards:
 * the instrument name, then who issues it (family badge · country · issuer ·
 * operation), then the ISIN in monospace for bank orders.
 */
export function LineIdentity({ o, s, href, size = "md" }: { o: Offer; s: OfferSummary; href?: string; size?: "md" | "lg" }) {
  const title = href ? <Link href={href}>{s.title}</Link> : s.title;
  return (
    <div className={`${styles.id} ${size === "lg" ? styles.lg : ""}`}>
      <div className={styles.title}>{title}</div>
      <div className={styles.meta}>
        <span className={`fam fam-${s.family}`}>{s.kind}</span>
        <span className="cc" title={o.countryName}>
          {COUNTRY_CODE[o.country]}
        </span>
        <span className={styles.issuer}>{s.subtitle}</span>
      </div>
      <div className={styles.isin}>{o.isin}</div>
    </div>
  );
}
