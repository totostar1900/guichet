"use client";

import { useActionState, useState } from "react";
import { FEATURE_REASONS } from "@/lib/domain/featured";
import { broadcastOpportunityAction, featureOfferAction, unfeatureOfferAction, type FeatureResult } from "./actions";
import styles from "./FeaturePanel.module.css";

export interface FeatureRow {
  id: string;
  title: string;
  hero: string;
  deadline?: string; // YYYY-MM-DD default for « jusqu'au »
  featured?: { reason: string; until: string; by: string };
}

/** Desk › carnet : what is « à la une » now, and the form to add one (max three, factual reason, expiry). */
export function FeaturePanel({ active, candidates }: { active: FeatureRow[]; candidates: FeatureRow[] }) {
  const [state, action, pending] = useActionState<FeatureResult | null, FormData>(featureOfferAction, null);
  const [pick, setPick] = useState(candidates[0]?.id ?? "");
  const [reason, setReason] = useState<string>(FEATURE_REASONS[0]);
  const chosen = candidates.find((c) => c.id === pick);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="panel">
      <div className="panel-h">
        <h2>À la une</h2>
        <span className="muted">Sélection du desk · {active.length}/3 · une raison factuelle, une date de fin, jamais un conseil</span>
      </div>
      {active.length > 0 && (
        <ul className={styles.list}>
          {active.map((a) => (
            <li key={a.id}>
              <div>
                <b>{a.title}</b>
                <small>
                  {a.featured?.reason} · jusqu&apos;au {a.featured?.until} · par {a.featured?.by}
                </small>
              </div>
              <div className={styles.rowActions}>
                <BroadcastForm offerId={a.id} />
                <form action={unfeatureOfferAction}>
                  <input type="hidden" name="offerId" value={a.id} />
                  <button className="btn sm ghost" type="submit">
                    Retirer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {active.length < 3 && candidates.length > 0 && (
        <form action={action} className={styles.form}>
          <label>
            <span>Ligne</span>
            <select name="offerId" value={pick} onChange={(e) => setPick(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {c.hero}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Raison (factuelle)</span>
            <input name="reason" list="feature-reasons" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={90} required />
            <datalist id="feature-reasons">
              {FEATURE_REASONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Jusqu&apos;au</span>
            <input name="until" type="date" key={pick} defaultValue={chosen?.deadline ?? today} min={today} required />
          </label>
          <button className="btn sm primary" type="submit" disabled={pending}>
            {pending ? "…" : "Mettre à la une"}
          </button>
          {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
        </form>
      )}
    </div>
  );
}

/** One line: pick the segment, get the count, confirm, send — every send is journalled in Diffusion. */
function BroadcastForm({ offerId }: { offerId: string }) {
  const [state, action, pending] = useActionState<FeatureResult | null, FormData>(broadcastOpportunityAction, null);
  return (
    <form action={action} className={styles.bc}>
      <input type="hidden" name="offerId" value={offerId} />
      <select name="segment" aria-label="Segment" defaultValue="Tous les clients">
        <option>Tous les clients</option>
        <option>Institutionnels + entreprises</option>
        <option>Personnes physiques + groupements</option>
      </select>
      <label className={styles.confirm}>
        <input type="checkbox" name="confirm" value="1" /> Confirmer
      </label>
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "…" : "Diffuser comme opportunité du moment"}
      </button>
      {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}
