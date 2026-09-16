"use client";

import { useActionState } from "react";
import { restoreVersionAction, type RestoreResult } from "./actions";
import styles from "./page.module.css";

export function RestoreForm({ offerId, version, current }: { offerId: string; version: number; current: number }) {
  const [state, action, pending] = useActionState<RestoreResult | null, FormData>(restoreVersionAction, null);
  return (
    <form action={action} className={styles.restore}>
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="current" value={current} />
      <input name="reason" placeholder="Pourquoi revenir à cette version ?" aria-label="Motif" required minLength={3} maxLength={300} />
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "…" : `Restaurer la v${version}`}
      </button>
      {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}
