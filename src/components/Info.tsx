import { GLOSSARY, type TermKey } from "@/lib/glossary";
import styles from "./Info.module.css";

/**
 * A small « i » that opens a bubble on hover, focus or tap (CSS only — works in
 * server components). `term` picks a glossary entry; `text` overrides it.
 */
export function Info({ term, text, label }: { term?: TermKey; text?: string; label?: string }) {
  const t = term ? GLOSSARY[term] : undefined;
  const body = text ?? t?.text ?? "";
  const title = label ?? (t ? ("long" in t && t.long ? `${t.short} — ${t.long}` : t.short) : "");
  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.btn} aria-label={`Explication : ${title || "ce terme"}`}>
        i
      </button>
      <span role="tooltip" className={styles.bubble}>
        {title && <b>{title}</b>}
        {body}
      </span>
    </span>
  );
}

/** Label followed by its bubble — for table headers, KPI titles, chart titles. */
export function Term({ term, children }: { term: TermKey; children?: React.ReactNode }) {
  return (
    <span className={styles.term}>
      {children ?? GLOSSARY[term].short}
      <Info term={term} />
    </span>
  );
}
