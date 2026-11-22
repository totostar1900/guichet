"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";
import { useActionState, useState } from "react";
import { sendCode, sendPhoneCode, verifyCode, verifyPhoneCode, type LoginState } from "./actions";
import { marquerConfiance } from "@/lib/device-client";
import { Attend, MessageDAttente } from "@/components/MessageDAttente";
import styles from "./page.module.css";

/** One-time code by e-mail or by phone (SMS / WhatsApp, per Supabase provider). */
/** `withCode`: the Guichet sends its own e-mail (Resend set): the code is what to expect; otherwise a link. */
export function EmailOtpForm({ next, phoneEnabled, withCode, creerLien = false, confiance = false }: { next: string; phoneEnabled: boolean; withCode: boolean; /** la porte du client propose « Créer un compte » ; celle du desk non */ creerLien?: boolean; /** la porte du client propose la case « Reconnaître cet appareil » ; celle du desk non */ confiance?: boolean }) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [state, action, pending] = useActionState<LoginState, FormData>(async (prev, form) => {
    if (form.get("restart")) return { step: form.get("mode") === "phone" ? "phone" : "email" };
    if (prev.step === "code") return verifyCode(prev, form);
    if (prev.step === "phone-code") return verifyPhoneCode(prev, form);
    return form.get("mode") === "phone" ? sendPhoneCode(prev, form) : sendCode(prev, form);
  }, { step: "email" });
  const t = useT();
  const inconnu = state.step === "email" && Boolean(state.inconnu);

  if (state.step === "code" || state.step === "phone-code") {
    const to = state.step === "code" ? state.email : state.phone;
    return (
      <form
        action={action}
        className={styles.otp}
        onSubmit={(e) => {
          /* l'état de la case est gardé avant l'envoi : la connexion recharge la page */
          if (confiance && !(e.nativeEvent as SubmitEvent).submitter?.hasAttribute("name")) marquerConfiance(new FormData(e.currentTarget).get("confiance") === "on");
        }}
      >
        <input type="hidden" name={state.step === "code" ? "email" : "phone"} value={to} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={mode} />
        <p className={styles.hint}>
          {t("Message envoyé à")} <b>{to}</b>{t(state.step === "code" ? (state.withCode ? " : saisissez le code qu'il contient. Il vaut dix minutes ; le dernier reçu est toujours le bon." : " : ouvrez le lien qu'il contient, il vous connecte ici. Si l'e-mail montre aussi un code, vous pouvez le saisir.") : ". Le code est valable quelques minutes.")}
        </p>
        <label className="field">
          {t(state.step === "code" && !state.withCode ? "Code à 6 chiffres (si l'e-mail en montre un)" : "Code à 6 chiffres")}
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={8} autoFocus={state.step !== "code" || Boolean(state.withCode)} required />
        </label>
        {confiance && (
          <label className={styles.confiance}>
            <input type="checkbox" name="confiance" defaultChecked />
            <span>{t("Reconnaître cet appareil : mes prochaines connexions se feront avec mon code seul, sans code e-mail.")}</span>
          </label>
        )}
        {state.error && <div className={styles.error}>{state.error}</div>}
        {pending && <MessageDAttente avecBouton={false} depuis={2} />}
        <div className={styles.row}>
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? <Attend>{t("Vérification…")}</Attend> : t("Se connecter")}
          </button>
          <button className="btn ghost" type="submit" name="restart" value="1" formNoValidate>
            {t(state.step === "code" ? "Changer d'adresse" : "Changer de numéro")}
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
            {t("Par e-mail")}
          </button>
          <button type="button" className={`btn sm ${mode === "phone" ? "primary" : ""}`} onClick={() => setMode("phone")}>
            {t("Par WhatsApp / SMS")}
          </button>
        </div>
      )}
      {mode === "email" ? (
        <label className="field">
          {t("Adresse e-mail")}
          <input name="email" type="email" autoComplete="email" placeholder={t("vous@exemple.com")} required />
        </label>
      ) : (
        <label className="field">
          {t("Numéro de téléphone (international)")}
          <input name="phone" type="tel" autoComplete="tel" placeholder="+237 6 87 67 67 67" required />
        </label>
      )}
      {inconnu ? (
        <div className={styles.error} role="alert">
          {t("Aucun compte avec cette adresse.")} <Link href={`/connexion/creer?next=${encodeURIComponent(next)}`}>{t("Créer un compte")}</Link>
        </div>
      ) : (
        state.error && <div className={styles.error}>{state.error}</div>
      )}
      <button className="btn primary" type="submit" disabled={pending}>
        {t(pending ? "Envoi…" : mode === "email" && !withCode ? "Recevoir mon lien de connexion" : "Recevoir un code")}
      </button>
      {creerLien && !inconnu && (
        <p className={styles.hint}>
          {t("Pas encore de compte ?")} <Link href={`/connexion/creer?next=${encodeURIComponent(next)}`}>{t("Créer un compte")}</Link>
        </p>
      )}
    </form>
  );
}
