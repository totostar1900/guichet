"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { setLangAction } from "@/i18n/actions";
import { useLang } from "@/i18n/client";
import styles from "./LangSwitch.module.css";

/** FR · EN — one click, the whole app switches; the choice is kept for a year. */
export function LangSwitch({ compact }: { compact?: boolean }) {
  const lang = useLang();
  const pathname = usePathname();
  const sp = useSearchParams();
  const back = `${pathname}${sp.toString() ? `?${sp}` : ""}`;
  const other = lang === "fr" ? "en" : "fr";
  return (
    <form action={setLangAction} className={`${styles.form} ${compact ? styles.compact : ""}`}>
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="lang" value={other} />
      <button type="submit" className={styles.btn} aria-label={lang === "fr" ? "Switch to English" : "Passer en français"} title={lang === "fr" ? "Switch to English" : "Passer en français"}>
        <span className={lang === "fr" ? styles.on : undefined}>FR</span>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <span className={lang === "en" ? styles.on : undefined}>EN</span>
      </button>
    </form>
  );
}
