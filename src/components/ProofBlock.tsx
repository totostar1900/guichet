"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { checkPhoneProof, guestSendEmailCode, guestVerifyEmailCode, sendPhoneProof } from "@/app/offres/[id]/actions";
import { normalizePhone } from "@/lib/format";
import styles from "./ProofBlock.module.css";

/**
 * The proof of a channel, inline: a six-digit code sent on the channel and
 * typed here, once. The phone (WhatsApp) is proven by Guichet's own code; a
 * guest's e-mail by the sign-in code, which also creates the account.
 */
export function ProofBlock({ kind, target, onProven, demo }: { kind: "phone" | "email"; target: string; onProven: (target: string) => void; demo?: string }) {
  const t = useT();
  const router = useRouter();
  const [sent, setSent] = useState<"idle" | "sent">("idle");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ error?: string; demo?: string } | null>(demo ? { demo } : null);
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      const r = kind === "phone" ? await sendPhoneProof(target) : await guestSendEmailCode(target);
      if (!r.ok) {
        setMsg({ error: r.error });
        return;
      }
      setSent("sent");
      setMsg("demoCode" in r && r.demoCode ? { demo: r.demoCode } : null);
    });
  const check = () =>
    start(async () => {
      if (kind === "phone") {
        const r = await checkPhoneProof(target, code);
        if (!r.ok) {
          setMsg({ error: r.error });
          return;
        }
        onProven(normalizePhone(target));
      } else {
        const r = await guestVerifyEmailCode(target, code);
        if (!r.ok) {
          setMsg({ error: r.error });
          return;
        }
        onProven(target.trim().toLowerCase());
        router.refresh(); // the session now exists: the page comes back signed in
      }
    });
  return (
    <div className={styles.proof} aria-live="polite">
      {sent === "idle" ? (
        <>
          <span>{t(kind === "phone" ? "Ce numéro n'est pas encore prouvé : un code arrive sur WhatsApp, une seule fois." : "Un code arrive sur cet e-mail : il vous connecte, et crée votre compte s'il n'existe pas.")}</span>
          <button type="button" className="btn sm primary" disabled={pending || !target} onClick={send}>
            {t(pending ? "Envoi…" : kind === "phone" ? "Recevoir le code sur WhatsApp" : "Recevoir le code par e-mail")}
          </button>
        </>
      ) : (
        <>
          <span>{t(kind === "phone" ? "Le code à six chiffres reçu sur WhatsApp :" : "Le code à six chiffres reçu par e-mail :")}</span>
          <div className={styles.proofRow}>
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" aria-label={t("Code à six chiffres")} />
            <button type="button" className="btn sm primary" disabled={pending || code.length !== 6} onClick={check}>
              {t(pending ? "Vérification…" : "Valider")}
            </button>
          </div>
          <button type="button" className={styles.linkBtn} disabled={pending} onClick={send}>
            {t("Renvoyer le code")}
          </button>
        </>
      )}
      {msg?.error && <em className={styles.proofError}>{msg.error}</em>}
      {msg?.demo && <em className={styles.proofDemo}>{t("Serveur de démonstration, code :")} {msg.demo}</em>}
    </div>
  );
}
