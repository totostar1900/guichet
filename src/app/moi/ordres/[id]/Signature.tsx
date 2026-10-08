"use client";

import { useActionState, useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { envoyerCodeOrdreAction, signerOrdreAction, type OrdreResult } from "./actions";
import styles from "./page.module.css";

/**
 * SIGNER SON ORDRE, PAR LE CODE QUI SERT DÉJÀ À LA CONVENTION.
 *
 * Même mécanisme, même preuve, même vocabulaire : il n'y a rien de nouveau à
 * apprendre, et c'est le but. Trois choses que cette journée a prouvées
 * nécessaires s'y retrouvent : la destination nommée AVANT l'envoi, le temps
 * qui reste, et « Je n'ai rien reçu ».
 */
function useReste(depuis: string | undefined, duree: number): number | null {
  const [reste, setReste] = useState<number | null>(null);
  useEffect(() => {
    if (!depuis) return;
    const fin = new Date(depuis).getTime() + duree;
    const battre = () => setReste(Math.max(0, Math.ceil((fin - Date.now()) / 1000)));
    battre();
    const id = setInterval(battre, 1000);
    return () => clearInterval(id);
  }, [depuis, duree]);
  return depuis ? reste : null;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function SignatureOrdre({ id, canal, codeEnvoyeLe }: { id: string; canal?: { to: string; channel: "whatsapp" | "email" }; codeEnvoyeLe?: string }) {
  const t = useT();
  const [envoi, envoyer, envoiEnCours] = useActionState<OrdreResult | null, FormData>(envoyerCodeOrdreAction, null);
  const [sign, signer, signEnCours] = useActionState<OrdreResult | null, FormData>(signerOrdreAction, null);
  const parti = envoi?.ok ? new Date().toISOString() : codeEnvoyeLe;
  const attente = useReste(parti, 45_000);
  const validite = useReste(parti, 10 * 60_000);
  const envoye = Boolean(parti) && validite !== 0;

  return (
    <section className={styles.signer}>
      <form action={envoyer} className={styles.bloc}>
        <input type="hidden" name="id" value={id} />
        {canal ? (
          <p className={styles.destinataire}>
            {t(canal.channel === "email" ? "Le code part par e-mail, à" : "Le code part par WhatsApp, au")} <b>{canal.to}</b>
          </p>
        ) : (
          <p className={styles.hint}>{t("Aucun canal d'envoi n'est configuré : le code s'affichera à l'écran.")}</p>
        )}
        {envoi && !envoi.ok && <div className={styles.err}>{envoi.error}</div>}
        {envoi?.ok && envoi.message && <div className={styles.ok}>{envoi.message}</div>}
        {envoi?.ok && envoi.code && (
          <div className={styles.demo}>
            {t("Code de démonstration :")} <b className="mono">{envoi.code}</b>
          </div>
        )}
        <button className="btn sm" type="submit" disabled={envoiEnCours || Boolean(attente)}>
          {envoiEnCours ? "…" : envoye ? (attente ? t("Renvoyer dans {s} s", { s: String(attente) }) : t("Renvoyer un code")) : t("Recevoir le code")}
        </button>
      </form>

      <form action={signer} className={styles.bloc}>
        <input type="hidden" name="id" value={id} />
        <div className={styles.codeRow}>
          <label className="field">
            {t("Code reçu")}
            <input name="code" inputMode="numeric" maxLength={6} placeholder={t("6 chiffres")} autoComplete="one-time-code" />
          </label>
          <button className="btn primary" type="submit" disabled={signEnCours}>
            {signEnCours ? "…" : t("Je signe mon ordre")}
          </button>
        </div>
        {validite ? <p className={styles.attente}>{t("Ce code reste valable {t}.", { t: mmss(validite) })}</p> : null}
        {sign && !sign.ok && <div className={styles.err}>{sign.error}</div>}
        {sign?.ok && sign.message && <div className={styles.ok}>{sign.message}</div>}
      </form>

      {envoye && (
        <details className={styles.aide}>
          <summary>{t("Je n'ai rien reçu")}</summary>
          <ul>
            {canal && <li>{t(canal.channel === "email" ? "Regardez la boîte {o}, courrier indésirable compris." : "Regardez les messages du numéro {o}.", { o: canal.to })}</li>}
            <li>{t("Un code vaut dix minutes ; passé ce délai, demandez-en un autre.")}</li>
            <li>{t("Rien ne marche ? Écrivez-nous depuis vos messages : votre ordre vous attend ici.")}</li>
          </ul>
        </details>
      )}
    </section>
  );
}
