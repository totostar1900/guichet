"use client";

import { useT } from "@/i18n/client";
import { useActionState } from "react";
import { relistOfferAction, withdrawOfferAction, type RestoreResult } from "./actions";
import styles from "./page.module.css";

/** Retirer / remettre en ligne : with a reason, never a deletion. */
export function LifecycleForm({ offerId, current, withdrawn }: { offerId: string; current: number; withdrawn: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<RestoreResult | null, FormData>(withdrawn ? relistOfferAction : withdrawOfferAction, null);
  return (
    <form action={action} className={styles.restore}>
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="current" value={current} />
      <input name="reason" placeholder={t(withdrawn ? "Pourquoi la remettre en ligne ?" : "Pourquoi la retirer ? (erreur, annulation, demande de l'émetteur…)")} aria-label={t("Motif")} required minLength={3} maxLength={300} />
      <button className={withdrawn ? "btn sm primary" : "btn sm"} type="submit" disabled={pending}>
        {pending ? "…" : withdrawn ? "Remettre en ligne" : "Retirer du Guichet"}
      </button>
      {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}
