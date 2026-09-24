"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { consentAction } from "./actions";
import styles from "./page.module.css";

/**
 * Ce que le client accepte de recevoir de notre initiative.
 *
 * Deux cases, une par canal, et rien de plus. Ce qui n'est pas ici et ne doit
 * pas y être : les messages liés à ses ordres. Un accusé de réception ou un
 * avis d'opéré découle de ce qu'il a demandé, il est dû, et lui offrir de les
 * couper serait lui proposer de ne pas être tenu au courant de son propre
 * argent.
 *
 * Chaque case s'enregistre au moment où on la touche : une case à cocher
 * suivie d'un bouton « Enregistrer » se retrouve à moitié posée un jour sur
 * deux.
 */
export function ConsentForm({ whatsapp, email, hasPhone, hasEmail }: { whatsapp: boolean; email: boolean; hasPhone: boolean; hasEmail: boolean }) {
  const t = useT();
  const [state, setState] = useState({ whatsapp, email });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (channel: "whatsapp" | "email", on: boolean) => {
    setState((s) => ({ ...s, [channel]: on }));
    setMsg(null);
    start(async () => {
      const r = await consentAction(channel, on);
      if (r.ok) setMsg(on ? t("C'est noté : vous recevrez nos informations.") : t("C'est noté : vous ne recevrez plus nos informations sur ce canal."));
      else {
        setState((s) => ({ ...s, [channel]: !on }));
        setMsg(r.error);
      }
    });
  };
  return (
    <div className={styles.consent}>
      <label>
        <input type="checkbox" checked={state.whatsapp} disabled={pending || !hasPhone} onChange={(e) => set("whatsapp", e.target.checked)} />
        <span>
          {t("Sur WhatsApp")}
          {!hasPhone && <small className="muted"> · {t("ajoutez un numéro plus haut")}</small>}
        </span>
      </label>
      <label>
        <input type="checkbox" checked={state.email} disabled={pending || !hasEmail} onChange={(e) => set("email", e.target.checked)} />
        <span>
          {t("Par e-mail")}
          {!hasEmail && <small className="muted"> · {t("ajoutez une adresse plus haut")}</small>}
        </span>
      </label>
      <small className="muted">{t("Les messages liés à vos ordres arrivent toujours : accusés de réception, avis de résultat, avis d'opéré, relevés. Ils découlent de ce que vous avez demandé.")}</small>
      {msg && <small className={styles.consentOk}>{msg}</small>}
    </div>
  );
}
