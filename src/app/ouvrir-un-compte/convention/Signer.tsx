"use client";

import { useActionState, useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { sendConventionCodeAction, verifyConventionCodeAction, type StepResult } from "../actions";
import styles from "./page.module.css";

/**
 * LA SIGNATURE, SEULE, ET RIEN AUTOUR D'ELLE.
 *
 * Elle vivait au milieu du dossier d'ouverture : sous huit puces, à côté de
 * six sections verrouillées, dans une page qui parlait aussi d'identité, de
 * pièces et de profil. Le 9 octobre 2026 la maison a tranché : la convention
 * a sa page, et ce bloc en est le pied. Il ne reçoit donc que ce qu'il faut
 * pour signer, et pas la fiche entière : une adresse où part le code, l'heure
 * du dernier envoi, et la règle qui dit si la signature est à portée.
 *
 * LE DÉCOMPTE PART DE NULL, pour la même raison qu'ailleurs : le serveur ne
 * connaît pas l'heure du navigateur, et rendre un chiffre des deux côtés est
 * le plus sûr moyen d'en rendre deux différents.
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

function Msg({ state }: { state: StepResult | null }) {
  if (!state) return null;
  return state.ok ? (state.message ? <div className={styles.ok}>{state.message}</div> : null) : <div className={styles.err}>{state.error}</div>;
}

export interface SignerProps {
  /** Où part le code, et si ce canal a été prouvé par un code ou seulement tapé dans le formulaire. */
  canal?: { to: string; channel: "whatsapp" | "email"; prouve: boolean };
  /** Le dernier code envoyé : l'heure du départ et l'adresse servie. */
  pending?: { at?: string; to?: string };
  /** Une reprise se dit sur le bouton : ce n'est pas une première signature. */
  reprise: boolean;
}

export function Signer({ canal, pending, reprise }: SignerProps) {
  const t = useT();
  const [sendState, sendAct, sending] = useActionState<StepResult | null, FormData>(sendConventionCodeAction, null);
  const [verState, verAct, verifying] = useActionState<StepResult | null, FormData>(verifyConventionCodeAction, null);
  const attente = useReste(pending?.at, 45_000);
  const validite = useReste(pending?.at, 10 * 60_000);
  const envoye = Boolean(pending?.at) && validite !== 0;
  const ou = pending?.to ?? canal?.to;
  const parMail = canal?.channel === "email";
  return (
    <>
      <form action={sendAct} className={styles.form}>
        {ou ? (
          <p className={styles.canal}>
            {t(parMail ? "Le code part par e-mail, à" : "Le code part par WhatsApp, au")} <b>{ou}</b>
            {canal && !canal.prouve ? <> · {t("cette adresse vient de votre formulaire : vérifiez-la")}</> : null}
          </p>
        ) : (
          <p className={styles.canal}>{t("Aucun canal d'envoi n'est configuré : le code s'affichera à l'écran.")}</p>
        )}
        <Msg state={sendState} />
        {sendState?.ok && sendState.code && (
          <div className={styles.demoCode}>
            {t("Code de démonstration :")} <b className="mono">{sendState.code}</b>
          </div>
        )}
        <div className={styles.rangee}>
          <button className="btn" type="submit" disabled={sending || Boolean(attente)}>
            {sending ? "…" : envoye ? (attente ? t("Renvoyer dans {s} s", { s: String(attente) }) : t("Renvoyer un code")) : t("Recevoir mon code")}
          </button>
        </div>
      </form>
      <form action={verAct} className={styles.form}>
        <div className={styles.rangee}>
          <label className={`field ${styles.champ}`}>
            {t("Code reçu")}
            <input name="code" inputMode="numeric" maxLength={6} placeholder={t("6 chiffres")} autoComplete="one-time-code" />
          </label>
          <button className="btn primary" type="submit" disabled={verifying}>
            {verifying ? "…" : t(reprise ? "Je reprends ma convention" : "Je signe ma convention")}
          </button>
        </div>
        {validite ? <p className={styles.attente}>{t("Ce code reste valable {t}.", { t: mmss(validite) })}</p> : null}
        <Msg state={verState} />
      </form>
      {envoye && (
        <details className={styles.aide}>
          <summary>{t("Je n'ai rien reçu")}</summary>
          <ul>
            {ou && <li>{t(parMail ? "Regardez la boîte {o}, courrier indésirable compris : un expéditeur récent y tombe souvent." : "Regardez les messages du numéro {o}, y compris les demandes de message.", { o: ou })}</li>}
            <li>{t("Un code vaut dix minutes ; passé ce délai, demandez-en un autre avec le bouton ci-dessus.")}</li>
            <li>
              {t("Ce n'est pas le bon numéro ou la bonne adresse ?")} <a href="/moi/securite">{t("Prouvez le bon canal dans Sécurité")}</a>
              {t(" : le code suivra celui que vous aurez prouvé.")}
            </li>
            <li>{t("Rien ne marche ? Écrivez-nous depuis vos messages : un conseiller vous rappelle et nous vous l'envoyons autrement.")}</li>
          </ul>
        </details>
      )}
    </>
  );
}
