"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { HEALTH_HOW } from "@/lib/health-how";
import styles from "./FromSante.module.css";

/**
 * The thin gold strip a desk page shows when it was opened from a Santé
 * point (`?depuis=sante&point=<key>`): the point, what to do here in one
 * line, the documentation section, and a way back. One click closes it.
 */
export function FromSante({ point, count }: { point: string; count?: string }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const how = HEALTH_HOW[point];
  if (!how || !open) return null;
  return (
    <div className={styles.strip} role="status">
      <span className={styles.eyebrow}>{t("Depuis Santé")}</span>
      <b>
        {t(how.label)}
        {count ? ` · ${count}` : ""}
      </b>
      <span className={styles.how}>{t(how.how)}</span>
      <span className={styles.links}>
        {how.docs && (
          <Link href={how.docs.href}>
            {t("Comment faire")} →
          </Link>
        )}
        <Link href="/desk/sante">{t("Retour à Santé")}</Link>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("Fermer")}>
          ×
        </button>
      </span>
    </div>
  );
}
