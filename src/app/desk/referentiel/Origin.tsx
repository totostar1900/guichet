"use client";

import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/** What a draft does to the entry at publication. */
export type DraftState = "set" | "reset" | "new" | "remove" | "removed";

/**
 * Where an entry's value comes from: the code default, the desk's published
 * value, and, on top, the draft waiting for « Publier ».
 */
export function Origin({ inDb, builtin, draft }: { inDb: boolean; builtin: boolean; draft?: DraftState }) {
  const tr = useT();
  return (
    <span className={styles.origin}>
      {inDb && builtin && <span className={`${styles.tag} ${styles.tagEdit}`}>{tr("modifié par le desk")}</span>}
      {inDb && !builtin && <span className={`${styles.tag} ${styles.tagNew}`}>{tr("créé par le desk")}</span>}
      {!inDb && !draft && <span className={styles.tag}>{tr("valeur par défaut")}</span>}
      {draft === "set" && <span className={`${styles.tag} ${styles.tagDraft}`}>{tr("brouillon")}</span>}
      {draft === "new" && <span className={`${styles.tag} ${styles.tagDraft}`}>{tr("nouveau · brouillon")}</span>}
      {draft === "reset" && <span className={`${styles.tag} ${styles.tagDraft}`}>{builtin ? tr("brouillon : retour à la valeur par défaut") : tr("brouillon : suppression")}</span>}
      {draft === "remove" && <span className={`${styles.tag} ${styles.tagDraft}`}>{tr("brouillon : suppression")}</span>}
      {draft === "removed" && <span className={`${styles.tag} ${styles.tagGone}`}>{tr("supprimée")}</span>}
    </span>
  );
}
