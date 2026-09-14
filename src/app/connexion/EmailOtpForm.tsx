"use client";

import { useActionState, useState } from "react";
import { sendCode, sendPhoneCode, verifyCode, verifyPhoneCode, type LoginState } from "./actions";
import styles from "./page.module.css";

/** One-time code by e-mail or by phone (SMS / WhatsApp, per Supabase provider). */
export function EmailOtpForm({ next, phoneEnabled }: { next: string; phoneEnabled: boolean }) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [state, action, pending] = useActionState<LoginState, FormData>(async (prev, form) => {
    if (form.get("restart")) return { step: form.get("mode") === "phone" ? "phone" : "email" };
    if (prev.step === "code") return verifyCode(prev, form);
    if (prev.step === "phone-code") return verifyPhoneCode(prev, form);
    return form.get("mode") === "phone" ? sendPhoneCode(prev, form) : sendCode(prev, form);
  }, { step: "email" });

  if (state.step === "code" || state.step === "phone-code") {
    const to = state.step === "code" ? state.email : state.phone;
    return (
      <form action={action} className={styles.otp}>
        <input type="hidden" name={state.step === "code" ? "email" : "phone"} value={to} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={mode} />
        <p className={styles.hint}>
          Code envoyé à <b>{to}</b>. Il est valable quelques minutes.
        </p>
        <label className="field">
          Code à 6 chiffres
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={8} autoFocus required />
        </label>
        {state.error && <div className={styles.error}>{state.error}</div>}
        <div className={styles.row}>
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? "Vérification…" : "Se connecter"}
          </button>
          <button className="btn ghost" type="submit" name="restart" value="1" formNoValidate>
            Changer {state.step === "code" ? "d'adresse" : "de numéro"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className={styles.otp}>
      <input type="hidden" name="mode" value={mode} />
      {phoneEnabled && (
        <div className={styles.row}>
          <button type="button" className={`btn sm ${mode === "email" ? "primary" : ""}`} onClick={() => setMode("email")}>
            Par e-mail
          </button>
          <button type="button" className={`btn sm ${mode === "phone" ? "primary" : ""}`} onClick={() => setMode("phone")}>
            Par WhatsApp / SMS
          </button>
        </div>
      )}
      {mode === "email" ? (
        <label className="field">
          Adresse e-mail
          <input name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" autoFocus required />
        </label>
      ) : (
        <label className="field">
          Numéro de téléphone (international)
          <input name="phone" type="tel" autoComplete="tel" placeholder="+237 6 87 67 67 67" autoFocus required />
        </label>
      )}
      {state.error && <div className={styles.error}>{state.error}</div>}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un code"}
      </button>
    </form>
  );
}
