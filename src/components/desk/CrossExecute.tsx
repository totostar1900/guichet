"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { crossAction, type MarketResult } from "@/app/desk/marche/actions";
import styles from "./CrossBook.module.css";

/**
 * Apparier : deux ordres, une quantité, un prix.
 *
 * La quantité et le prix arrivent remplis, aux valeurs que le carnet a
 * calculées : le titre commun et le milieu de la bande. Ce ne sont pas des
 * recommandations, c'est le point de départ d'une négociation que l'opérateur
 * a menée au téléphone et dont il vient consigner le résultat. Il les corrige
 * donc librement, et le serveur refuse ce qui sort des limites des deux
 * clients plutôt que de laisser le formulaire les deviner.
 *
 * Le bouton dit « Apparier » et non « Exécuter » parce que le geste porte sur
 * deux ordres à la fois : c'est ce qui le distingue du bouton d'exécution
 * ordinaire, juste en dessous dans la même page, qui n'en touche qu'un.
 */
export function CrossExecute({ buyId, sellId, qty, price, step, lot }: { buyId: string; sellId: string; qty: number; price: number; step: string; lot: number }) {
  const t = useT();
  const [state, action, pending] = useActionState<MarketResult | null, FormData>(crossAction, null);
  return (
    <form action={action} className={styles.exec}>
      <input type="hidden" name="buyId" value={buyId} />
      <input type="hidden" name="sellId" value={sellId} />
      <input name="qty" type="number" min={lot} max={qty} step={lot} defaultValue={qty} aria-label={t("Titres appariés")} className={styles.num} required />
      <input name="price" type="number" min={0} step={step} defaultValue={price || ""} aria-label={t("Prix d'exécution")} className={styles.num} required />
      <button className="btn sm" type="submit" disabled={pending}>
        {t(pending ? "…" : "Apparier")}
      </button>
      {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}
