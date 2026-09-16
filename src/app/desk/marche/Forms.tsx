"use client";

import { useActionState } from "react";
import { executeOrderAction, fundBordereauAction, ingestBocAction, settleOrderAction, toggleHiddenAction, updateFundTermsAction, updateQuoteAction, uploadBocAction, type MarketResult } from "./actions";
import styles from "./page.module.css";

function Msg({ state }: { state: MarketResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
}

export function QuoteForm({ offerId, last, bid, ask, step, version }: { offerId: string; last?: number; bid?: number; ask?: number; step: string; version?: number }) {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(updateQuoteAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="offerId" value={offerId} />
      {version != null && <input type="hidden" name="version" value={version} />}
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

export function ExecuteForm({ intentId, units, refPrice, step, unitStep = "1" }: { intentId: string; units: number; refPrice: number; step: string; unitStep?: string }) {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(executeOrderAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="intentId" value={intentId} />
      <input name="executedPrice" type="number" step={step} defaultValue={refPrice} aria-label="Prix exécuté" className={styles.num} required />
      <input name="executedUnits" type="number" step={unitStep} min={unitStep} max={unitStep === "1" ? units : undefined} defaultValue={units} aria-label="Quantité exécutée" className={styles.num} required />
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

export function FundTermsForm({ offerId, fund }: { offerId: string; fund: { distributed: boolean; entryFeePct: number; exitFeePct: number; minAmount: number; cutoff?: string; agreementRef?: string; settlementDays?: number } }) {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(updateFundTermsAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="offerId" value={offerId} />
      <label className={styles.check} title="Convention de distribution signée : le fonds apparaît dans le Guichet avec « Souscrire »">
        <input type="checkbox" name="distributed" value="on" defaultChecked={fund.distributed} /> distribué
      </label>
      <input name="agreementRef" defaultValue={fund.agreementRef ?? ""} placeholder="réf. convention" aria-label="Référence de la convention" className={styles.num} />
      <input name="entryFeePct" type="number" step="0.01" min={0} max={10} defaultValue={fund.entryFeePct} placeholder="entrée %" aria-label="Droits d'entrée %" className={styles.short} />
      <input name="exitFeePct" type="number" step="0.01" min={0} max={10} defaultValue={fund.exitFeePct} placeholder="sortie %" aria-label="Droits de sortie %" className={styles.short} />
      <input name="minAmount" type="number" step={1000} min={0} defaultValue={fund.minAmount} placeholder="minimum" aria-label="Souscription minimale (FCFA)" className={styles.num} />
      <input name="cutoff" defaultValue={fund.cutoff ?? ""} placeholder="centralisation (ex. mardi 12 h)" aria-label="Centralisation" className={styles.wide} />
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "…" : "Enregistrer"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function FundBordereauButton({ manager, count }: { manager: string; count: number }) {
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(fundBordereauAction, null);
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="manager" value={manager} />
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "Génération…" : `Bordereau ${manager} (${count})`}
      </button>
      <Msg state={state} />
    </form>
  );
}
