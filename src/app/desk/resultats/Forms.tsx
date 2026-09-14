"use client";

import { useActionState } from "react";
import { fmt } from "@/lib/format";
import { applyResultsAction, applySettlementAction, type ResultsOutcome } from "./actions";
import styles from "./page.module.css";

interface Line {
  offerId: string;
  title: string;
  isin: string;
  kind: string;
  proposed: number;
  orders: { id: string; ref: string; client: string; units: string; amount: number }[];
}

/** Served price per line and allocation per transmitted order — one submit applies the auction. */
export function ResultsForm({ offerIds, lines }: { offerIds: string[]; lines: Line[] }) {
  const [state, action, pending] = useActionState<ResultsOutcome | null, FormData>(applyResultsAction, null);
  return (
    <form action={action} className={styles.results}>
      {offerIds.map((id) => (
        <input key={id} type="hidden" name="offerId" value={id} />
      ))}
      {lines.map((l) => (
        <div key={l.offerId} className={styles.line}>
          <div className={styles.lineHead}>
            <div>
              <b>{l.title}</b> <span className="mono muted">{l.isin}</span>
            </div>
            {l.kind === "BTA" ? (
              <label className="field">
                Taux servi (% précompté)
                <input name={`rate_${l.offerId}`} type="number" step="0.01" defaultValue={l.proposed} />
              </label>
            ) : l.kind === "RACHAT" ? (
              <span className="muted" style={{ fontSize: ".8rem" }}>
                Rachat au pair
              </span>
            ) : (
              <label className="field">
                Prix servi (% du nominal, 3 déc.)
                <input name={`price_${l.offerId}`} type="number" step="0.001" defaultValue={l.proposed} />
              </label>
            )}
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Ordre</th>
                <th>Client</th>
                <th className="r">Demandé</th>
                <th className="r">Allocation (%)</th>
              </tr>
            </thead>
            <tbody>
              {l.orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.ref}</td>
                  <td>{o.client}</td>
                  <td className="r num">
                    {o.units} · {fmt(o.amount)}
                  </td>
                  <td className="r">
                    <input name={`alloc_${o.id}`} type="number" min={0} max={100} step={1} defaultValue={100} className={styles.alloc} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {state && (state.ok ? <div className={styles.ok}>{state.message}</div> : <div className={styles.err}>{state.error}</div>)}
      <div className={styles.foot}>
        <small className="muted">0 % = non servi. Les avis de résultat sont générés et envoyés à la validation.</small>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Application…" : "Appliquer les résultats"}
        </button>
      </div>
    </form>
  );
}

export function SettlementForm({ offerIds, settleOn }: { offerIds: string[]; settleOn: string }) {
  const [state, action, pending] = useActionState<ResultsOutcome | null, FormData>(applySettlementAction, null);
  return (
    <form action={action} className={styles.settleForm}>
      {offerIds.map((id) => (
        <input key={id} type="hidden" name="offerId" value={id} />
      ))}
      {state && (state.ok ? <span className={styles.ok}>{state.message}</span> : <span className={styles.err}>{state.error}</span>)}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "…" : `Confirmer le règlement du ${settleOn}`}
      </button>
    </form>
  );
}
