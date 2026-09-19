"use client";

import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { useActionState } from "react";
import { testBotAction, type BotTest } from "./actions";

export function BotBench({ contacts }: { contacts: { name: string; phone: string }[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<BotTest | null, FormData>(testBotAction, null);
  return (
    <form action={action} style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 12, alignItems: "start" }}>
      <label className="field">
        {t("Numéro de l'expéditeur")}
        <Select block name="phone" value={contacts[0]?.phone ?? ""} options={[...contacts.map((c) => ({ value: c.phone ?? "", label: `${c.name} · ${c.phone}` })), { value: "+237600000000", label: t("Numéro inconnu · +237600000000") }]} />
      </label>
      <label className="field">
        {t("Message reçu")}
        <textarea name="text" rows={3} placeholder={t("Ex. : C'est quoi le coupon couru ? / Je veux 20 millions sur la ligne à 1 an 5 mois / Où en est mon ordre ?")} required />
      </label>
      <label style={{ fontSize: ".8rem", color: "var(--ink-2)", display: "flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" name="live" /> {t("Créer réellement les intentions détectées")}
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <button className="btn primary" type="submit" disabled={pending}>
          {t(pending ? "Le robot réfléchit…" : "Tester")}
        </button>
      </div>
      {state && (
        <div style={{ gridColumn: "1 / -1" }}>
          {state.ok ? (
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "12px 14px", fontSize: ".85rem" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Réponse{state.contactName ? ` à ${state.contactName}` : " (numéro inconnu)"}
              </div>
              <div style={{ whiteSpace: "pre-line" }}>{state.answer.reply}</div>
              <div className="muted" style={{ marginTop: 8, fontSize: ".78rem" }}>
                {state.answer.handoff ? `Rappel conseiller demandé : ${state.answer.handoffReason ?? ""}` : "Pas de rappel nécessaire"}
                {state.answer.intent ? ` · intention détectée : ${state.answer.intent.type} sur ${state.answer.intent.offerId}${state.answer.intent.amount ? ` · ${state.answer.intent.amount.toLocaleString("fr-FR")} FCFA` : ""}${state.createdRef ? ` · créée (${state.createdRef})` : " (non créée : essai)"}` : ""}
              </div>
            </div>
          ) : (
            <div style={{ background: "var(--crit-soft)", color: "var(--crit)", borderRadius: "var(--radius)", padding: "8px 12px", fontSize: ".8rem" }}>{state.error}</div>
          )}
        </div>
      )}
    </form>
  );
}
