import Link from "next/link";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { newsFor } from "@/lib/news";
import type { NewsLinkKind } from "@/lib/news/model";
import styles from "./RelatedNews.module.css";

/** « Actualités liées » on a line, a company or an issuer: the desk's selection about it, newest first. */
export async function RelatedNews({ kind, keyOf, heading = "h3", className = "" }: { kind: NewsLinkKind; keyOf: string; heading?: "h2" | "h3"; className?: string }) {
  const [t, lang, items] = await Promise.all([getT(), getLang(), newsFor(kind, keyOf)]);
  if (items.length === 0) return null;
  const H = heading;
  return (
    <div className={`${styles.box} ${className}`}>
      <H>
        {t("Actualités liées")} <small>({items.length})</small>
      </H>
      <ul className={styles.list}>
        {items.slice(0, 4).map((n) => (
          <li key={n.id}>
            <span className={styles.when}>
              {fmtDate(n.publishedAt, false)} · {n.source}
            </span>
            <a href={n.url} target="_blank" rel="noreferrer noopener">
              {lang === "en" && n.titleEn ? n.titleEn : t(n.title)} ↗
            </a>
            <span className={styles.why}>{lang === "en" && n.whyEn ? n.whyEn : t(n.why)}</span>
          </li>
        ))}
      </ul>
      <Link href="/actualites" className={styles.more}>
        {t("Toutes les actualités")} →
      </Link>
    </div>
  );
}
