"use client";

import { useT } from "@/i18n/client";
import { useActionState } from "react";
import type { ApprovalPolicy } from "@/lib/policy";
import { decideApprovalAction, savePolicyAction, type ApprovalResult } from "./actions";
import styles from "./page.module.css";

function Msg({ state }: { state: ApprovalResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
}

export function DecideForm({ id }: { id: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<ApprovalResult | null, FormData>(decideApprovalAction, null);
  return (
    <form action={action} className={styles.decide}>
      <input type="hidden" name="id" value={id} />
      <input name="note" placeholder={t("Note (obligatoire pour refuser)")} aria-label={t("Note")} maxLength={500} />
      <button className="btn sm primary" type="submit" name="decision" value="approuve" disabled={pending}>
        {t(pending ? "…" : "Approuver et publier")}
      </button>
      <button className="btn sm ghost" type="submit" name="decision" value="refuse" disabled={pending}>
        {t("Refuser")}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function PolicyForm({ p }: { p: ApprovalPolicy }) {
  const t = useT();
  const [state, action, pending] = useActionState<ApprovalResult | null, FormData>(savePolicyAction, null);
  return (
    <form action={action} className={styles.policy}>
      <label className={styles.check}>
        <input type="checkbox" name="enabled" defaultChecked={p.enabled} /> {t("Fenêtre déléguée active (hors fenêtre, un responsable approuve)")}
      </label>
      <div className={styles.grid}>
        <label>
          <span>{t("Prix OTA / APE : minimum (%)")}</span>
          <input name="priceMin" type="number" step="0.5" defaultValue={p.pricePct.min} />
        </label>
        <label>
          <span>{t("Prix OTA / APE : maximum (%)")}</span>
          <input name="priceMax" type="number" step="0.5" defaultValue={p.pricePct.max} />
        </label>
        <label>
          <span>{t("Taux précompté BTA : minimum (%)")}</span>
          <input name="rateMin" type="number" step="0.05" defaultValue={p.precountRate.min} />
        </label>
        <label>
          <span>{t("Taux précompté BTA : maximum (%)")}</span>
          <input name="rateMax" type="number" step="0.05" defaultValue={p.precountRate.max} />
        </label>
        <label>
          <span>{t("Cours saisi : écart maximal vs dernier cours (%)")}</span>
          <input name="quoteMovePct" type="number" step="0.5" defaultValue={p.quoteMovePct} />
        </label>
        <label>
          <span>{t("Fonds : droits d'entrée maximum (%)")}</span>
          <input name="fundEntryFeeMax" type="number" step="0.1" defaultValue={p.fundEntryFeeMax} />
        </label>
      </div>
      <div className={styles.row}>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {t(pending ? "…" : "Enregistrer la fenêtre")}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}
