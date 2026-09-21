"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { couponBatchAction, type ActResult } from "../clients/acts-actions";
import styles from "./TodayPanel.module.css";

/** One click under the coupons tile: every paid flow without a notice gets its notice, sent where the client can be reached. */
export function CouponBatch({ n }: { n: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<ActResult | null, FormData>(async () => couponBatchAction(), null);
  return (
    <form action={action} className={styles.batch}>
      <span>{t("Avis de coupon et de remboursement à émettre : {n}", { n })}</span>
      <button type="submit" className="btn sm primary" disabled={pending}>
        {pending ? "…" : t("Émettre les avis")}
      </button>
      {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}
