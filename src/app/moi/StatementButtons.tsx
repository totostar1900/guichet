"use client";

import { useActionState } from "react";
import { statementAction, type StatementResult } from "./actions";

/** Relevé / attestation generated on demand for the signed-in client. */
export function StatementButtons() {
  const [state, action, pending] = useActionState<StatementResult | null, FormData>(statementAction, null);
  return (
    <form action={action} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn sm" type="submit" name="type" value="releve" disabled={pending}>
        Relevé de position
      </button>
      <button className="btn sm" type="submit" name="type" value="attestation" disabled={pending}>
        Attestation de détention
      </button>
      {state?.ok && (
        <a className="btn sm primary" href={`/desk/documents/pdf/${state.id}`} target="_blank" rel="noreferrer">
          Ouvrir {state.number}
        </a>
      )}
      {state && !state.ok && <span style={{ color: "var(--crit)", fontSize: ".78rem" }}>{state.error}</span>}
    </form>
  );
}
