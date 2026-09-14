"use client";

import { useActionState } from "react";
import { generateBordereauAction, generateDocumentAction, type DocResult } from "./actions";
import styles from "./page.module.css";

/** Generates one client document; opens the PDF in a new tab when done. */
export function GenerateButton({ type, intentId, label, withAllocation }: { type: string; intentId: string; label: string; withAllocation?: boolean }) {
  const [state, action, pending] = useActionState<DocResult | null, FormData>(generateDocumentAction, null);
  return (
    <form action={action} className={styles.genForm}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="intentId" value={intentId} />
      {withAllocation && <input name="allocation" type="number" min={0} max={100} defaultValue={100} className={styles.alloc} title="Allocation (%)" aria-label="Allocation en %" />}
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "…" : label}
      </button>
      {state?.ok && (
        <a className="btn sm primary" href={`/desk/documents/pdf/${state.id}`} target="_blank" rel="noreferrer">
          Ouvrir
        </a>
      )}
      {state && !state.ok && <span className={styles.err}>{state.error}</span>}
    </form>
  );
}

export function BordereauButton({ country, deadlineAt, disabled, label }: { country: string; deadlineAt: string; disabled?: boolean; label: string }) {
  const [state, action, pending] = useActionState<DocResult | null, FormData>(generateBordereauAction, null);
  return (
    <form action={action} className={styles.genForm}>
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="deadlineAt" value={deadlineAt} />
      <button className="btn sm primary" type="submit" disabled={pending || disabled}>
        {pending ? "Génération…" : label}
      </button>
      {state?.ok && (
        <a className="btn sm" href={`/desk/documents/pdf/${state.id}`} target="_blank" rel="noreferrer">
          Ouvrir
        </a>
      )}
      {state && !state.ok && <span className={styles.err}>{state.error}</span>}
    </form>
  );
}
