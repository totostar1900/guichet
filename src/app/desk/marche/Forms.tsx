"use client";

import { useActionState } from "react";
import { executeOrderAction, ingestBocAction, settleOrderAction, toggleHiddenAction, updateQuoteAction, uploadBocAction, type MarketResult } from "./actions";
import styles from "./page.module.css";

function Msg({ state }: { state: MarketResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
}

export function QuoteForm({ offerId, last, bid, ask, step }: { offerId: string; last?: number; bid?: number; ask?: number; step: string }) {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(updateQuoteAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="offerId" value={offerId} />
      <input name="lastPrice" type="number" step={step} defaultValue={last} placeholder="dernier" aria-label="Dernier cours" className={styles.num} required />
      <input name="bid" type="number" step={step} defaultValue={bid} placeholder="acheteur" aria-label="Acheteur" className={styles.num} />
      <input name="ask" type="number" step={step} defaultValue={ask} placeholder="vendeur" aria-label="Vendeur" className={styles.num} />
      <input name="lastPriceOn" type="date" aria-label="Date du cours" className={styles.date} />
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "…" : "Mettre à jour"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function ExecuteForm({ intentId, units, refPrice, step }: { intentId: string; units: number; refPrice: number; step: string }) {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(executeOrderAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="intentId" value={intentId} />
      <input name="executedPrice" type="number" step={step} defaultValue={refPrice} aria-label="Prix exécuté" className={styles.num} required />
      <input name="executedUnits" type="number" step={1} min={1} max={units} defaultValue={units} aria-label="Quantité exécutée" className={styles.num} required />
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "…" : "Exécuté"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function SettleButton({ intentId }: { intentId: string }) {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(settleOrderAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="intentId" value={intentId} />
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "…" : "Réglé"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function IngestForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(ingestBocAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input name="sessionDate" type="date" defaultValue={defaultDate} aria-label="Séance" className={styles.date} required />
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "Téléchargement et lecture…" : "Ingérer le bulletin"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function UploadForm() {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(uploadBocAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input name="file" type="file" accept="application/pdf" aria-label="PDF du bulletin" className={styles.date} required />
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "Lecture…" : "Lire ce PDF"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function HideButton({ offerId, hidden }: { offerId: string; hidden: boolean }) {
  return (
    <form action={toggleHiddenAction} className={styles.inline}>
      <input type="hidden" name="offerId" value={offerId} />
      <button className="btn sm" type="submit" title={hidden ? "Réafficher cette ligne dans le Guichet" : "Masquer cette ligne du Guichet (elle reste cotée ici)"}>
        {hidden ? "Afficher" : "Masquer"}
      </button>
    </form>
  );
}
