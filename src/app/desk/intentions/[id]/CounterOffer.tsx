"use client";

import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { counterPriceText, counterText, counterUnit, forInput, type Counter } from "@/lib/domain/counter";
import type { Intent, Offer } from "@/lib/domain/types";
import { fmt, fmtDateTime } from "@/lib/format";
import { proposeCounter } from "../../counter-actions";
import styles from "./page.module.css";

/**
 * Proposer d'autres conditions.
 *
 * Un carnet étroit impose presque à chaque séance de servir autrement que
 * demandé. Le desk n'avait que deux issues : exécuter autrement que demandé,
 * ce qu'on ne fait pas, ou clore, ce qui perd l'ordre.
 *
 * Ce formulaire ne change rien à l'ordre : il soumet. L'écran montre la phrase
 * exacte que le client recevra, et l'échéance au-delà de laquelle elle ne vaut
 * plus, parce qu'un prix ne tient pas.
 */
export function CounterOffer({ intent, offer, defaultUntil, now }: { intent: Intent; offer: Offer; defaultUntil: string; /** l’heure du rendu : comparer a Date.now() pendant le rendu rendrait le composant impur */ now: string }) {
  const t = useT();
  const id = useId();
  const [amount, setAmount] = useState(intent.amount != null ? String(intent.amount) : "");
  const [price, setPrice] = useState(intent.limitPrice != null ? String(intent.limitPrice) : "");
  const [note, setNote] = useState("");
  const [until, setUntil] = useState(forInput(defaultUntil));

  const n = Number(amount.replace(/\s/g, "").replace(",", "."));
  const p = Number(price.replace(/\s/g, "").replace(",", "."));
  const newAmount = amount && !isNaN(n) && n > 0 && n !== intent.amount ? n : undefined;
  const newPrice = price && !isNaN(p) && p > 0 && p !== intent.limitPrice ? p : undefined;
  const changes = Boolean(newAmount || newPrice);
  const when = until ? new Date(until) : null;
  const futureEnough = Boolean(when && !isNaN(when.getTime()) && when.getTime() > new Date(now).getTime());

  const bits: string[] = [];
  if (newAmount) bits.push(t("{n} {u} au lieu de {o}", { n: fmt(newAmount), u: t(counterUnit(offer)), o: intent.amount != null ? fmt(intent.amount) : "—" }));
  if (newPrice) bits.push(intent.limitPrice != null ? t("{p} au lieu de {o}", { p: counterPriceText(offer, newPrice), o: counterPriceText(offer, intent.limitPrice) }) : counterPriceText(offer, newPrice));

  // La phrase exacte que le client recevra, composée avec les mêmes fonctions que
  // le message : montrer autre chose que ce qui partira ne serait pas une relecture.
  const preview: Counter | null = changes && futureEnough ? { amount: newAmount, limitPrice: newPrice, note, until: when!.toISOString(), by: "", at: "" } : null;
  const sentence = preview ? counterText(preview, intent, offer) : "";

  return (
    <form id={id} action={proposeCounter} className={styles.counter}>
      <input type="hidden" name="intentId" value={intent.id} />
      <div className={styles.counterRow}>
        <label className="field">
          {t("Quantité proposée")} <small>{t(counterUnit(offer))}</small>
          <input name="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="field">
          {t("Prix proposé")} <small>{t(offer.instrument === "obligation" ? "% du nominal" : "FCFA")}</small>
          <input name="limitPrice" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="field">
          {t("Vaut jusqu'au")}
          <input name="until" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
        </label>
      </div>
      <input className={styles.counterNote} name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Pourquoi, en une phrase : le client la lira en premier")} maxLength={240} />
      <ConfirmPublish
        form={id}
        className="btn"
        label={t("Proposer d'autres conditions")}
        confirmLabel={t("Envoyer la proposition")}
        title={t("Proposer d'autres conditions sur {r}", { r: intent.ref })}
        disabled={!changes || !futureEnough}
        lines={[
          t("Rien ne change sur l'ordre tant que {who} n'a pas accepté.", { who: intent.clientName }),
          bits.join(" · ") || t("Indiquez une quantité ou un prix différents."),
          when ? t("La proposition vaut jusqu'au {d}, après quoi l'ordre revient tel qu'il était.", { d: fmtDateTime(when.toISOString()) }) : "",
          sentence ? t("Le client lira : « {x} »", { x: sentence }) : "",
        ].filter(Boolean)}
      />
    </form>
  );
}
