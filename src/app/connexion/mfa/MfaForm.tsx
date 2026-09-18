"use client";

import { useT } from "@/i18n/client";
import { useActionState } from "react";
import { verifyEnrol, verifyMfa, type MfaState } from "./actions";
import styles from "../page.module.css";

export function MfaForm({ initial, next }: { initial: MfaState; next: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<MfaState, FormData>((prev, form) => (prev.step === "enrol" ? verifyEnrol(prev, form) : verifyMfa(prev, form)), initial);
  if (state.step === "error") return <div className={styles.error}>{state.error}</div>;
  return (
    <form action={action} className={styles.otp}>
      <input type="hidden" name="next" value={next} />
      {state.step === "enrol" && (
        <>
          <p className={styles.hint}>
            {t("Ouvrez une application d'authentification (Google Authenticator, Microsoft Authenticator, Authy…), scannez ce code, puis saisissez le nombre à 6 chiffres qu'elle affiche. À faire une seule fois ; le téléphone devient votre clé.")}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt="QR code à scanner" width={180} height={180} style={{ background: "#fff", borderRadius: 8, padding: 6, alignSelf: "flex-start" }} />
          <p className={styles.hint}>
            {t("Sans caméra, saisissez la clé :")} <code className="mono">{state.secret}</code>
          </p>
        </>
      )}
      {state.step === "verify" && <p className={styles.hint}>{t("Saisissez le code à 6 chiffres affiché par votre application d'authentification.")}</p>}
      <label className="field">
        {t("Code à 6 chiffres")}
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} autoFocus required />
      </label>
      {state.error && <div className={styles.error}>{state.error}</div>}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Vérification…" : state.step === "enrol" ? "Activer" : "Continuer"}
      </button>
    </form>
  );
}
