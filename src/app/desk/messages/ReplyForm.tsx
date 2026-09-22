"use client";

import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { useActionState } from "react";
import { replyAction } from "./actions";
import styles from "./page.module.css";

export function ReplyForm({ to, channel, name, lines = [] }: { to: string; channel: "whatsapp" | "email"; name?: string; lines?: { id: string; title: string }[] }) {
  const t = useT();
  const [state, action, pending] = useActionState(replyAction, null);
  return (
    <form action={action} className={styles.reply} key={to}>
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="channel" value={channel} />
      {name && <input type="hidden" name="name" value={name} />}
      {channel === "email" && <input name="subject" placeholder={t("Objet")} className={styles.subject} />}
      <textarea name="body" rows={3} placeholder={channel === "whatsapp" ? "Répondre sur WhatsApp (fenêtre de 24 h après le dernier message du client)" : "Répondre par e-mail"} required />
      {lines.length > 0 && (
        <label className={styles.withLine}>
          <span>{t("Répondre avec la ligne")}</span>
          <Select block name="offerId" value="" options={[{ value: "", label: t("aucune") }, ...lines.map((l) => ({ value: l.id, label: l.title }))]} />
          <small className="muted">{t(channel === "whatsapp" ? "La fiche, et un lien qui reconnaît ce numéro : l'intention ne demandera que le code e-mail." : "La fiche de la ligne, en lien.")}</small>
        </label>
      )}
      <div className={styles.replyRow}>
        {state && !state.ok && <span className={styles.err}>{state.error}</span>}
        {state?.ok && <span className={styles.okMsg}>{t("Envoyé.")}</span>}
        <button className="btn primary sm" type="submit" disabled={pending}>
          {pending ? "Envoi…" : channel === "whatsapp" ? "Envoyer sur WhatsApp" : "Envoyer l'e-mail"}
        </button>
      </div>
    </form>
  );
}
