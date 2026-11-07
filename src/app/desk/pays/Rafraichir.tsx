"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { rafraichirPays, type PaysResult } from "./actions";
import styles from "./page.module.css";

/** Relit le FMI et la Banque mondiale : la même lecture que le robot mensuel, à la demande. */
export function Rafraichir() {
  const t = useT();
  const [state, action, pending] = useActionState<PaysResult | null, FormData>((p) => rafraichirPays(p), null);
  return (
    <form action={action} className={styles.rafraichir}>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? t("Lecture en cours…") : t("Relire le FMI et la Banque mondiale")}
      </button>
      {state && <span className={state.ok ? styles.fait : styles.erreur} role="status">{state.ok ? state.message : state.error}</span>}
    </form>
  );
}
