"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { signerAction } from "../../actions";
import styles from "./page.module.css";

/** Signer avec le code du compte, le même que celui du verrou. */
export function Signature({ accordId }: { accordId: string }) {
  const t = useT();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, start] = useTransition();
  return (
    <form
      className={styles.signature}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await signerAction(accordId, pin);
          setMsg({ ok: r.ok, texte: r.ok ? r.message : r.error });
          setPin("");
        });
      }}
    >
      <label className={styles.champ}>
        <span>{t("Votre code à six chiffres")}</span>
        <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
      </label>
      <button className="btn primary" type="submit" disabled={enCours || pin.length !== 6}>
        {t("Signer le contrat")}
      </button>
      {msg && <p className={msg.ok ? styles.ok : styles.ko} role="status">{t(msg.texte)}</p>}
    </form>
  );
}
