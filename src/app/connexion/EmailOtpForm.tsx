"use client";

import { useActionState } from "react";
import { sendCode, verifyCode, type LoginState } from "./actions";
import styles from "./page.module.css";

export function EmailOtpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    async (prev, form) => (prev.step === "code" && !form.get("restart") ? verifyCode(prev, form) : sendCode(prev, form)),
    { step: "email" },
  );

  if (state.step === "code") {
    return (
      <form action={action} className={styles.otp}>
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={next} />
        <p className={styles.hint}>
          Code envoyé à <b>{state.email}</b>. Il est valable quelques minutes.
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
            Changer d&apos;adresse
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className={styles.otp}>
      <label className="field">
        Adresse e-mail
        <input name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" autoFocus required />
      </label>
      {state.error && <div className={styles.error}>{state.error}</div>}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un code"}
      </button>
    </form>
  );
}
