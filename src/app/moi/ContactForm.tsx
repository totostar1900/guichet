"use client";

import { useT } from "@/i18n/client";
import { useActionState } from "react";
import { contactAction, type ContactResult } from "./actions";
import styles from "./page.module.css";

/** Phone and e-mail the desk uses for this client — both required, kept on the profile. */
export function ContactForm({ phone, email }: { phone?: string; email?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<ContactResult | null, FormData>(contactAction, null);
  return (
    <form action={action} className={styles.contact}>
      <label className="field">
        Téléphone (WhatsApp)
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6 87 67 67 67" defaultValue={state?.ok ? state.phone : phone} required />
      </label>
      <label className="field">
        {t("E-mail")}
        <input name="email" type="email" inputMode="email" autoComplete="email" placeholder={t("vous@exemple.com")} defaultValue={state?.ok ? state.email : email} required />
      </label>
      <div className={styles.contactFoot}>
        <small className="muted">{t("Accusés de réception sur WhatsApp et par e-mail ; bulletins et appels de fonds par e-mail ; rappels d'un conseiller par téléphone.")}</small>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      {state && !state.ok && <div className={styles.contactErr}>{state.error}</div>}
      {state?.ok && <div className={styles.contactOk}>{t("Coordonnées enregistrées.")}</div>}
    </form>
  );
}
