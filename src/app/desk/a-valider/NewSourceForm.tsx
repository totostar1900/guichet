"use client";

import { useT } from "@/i18n/client";
import { useActionState } from "react";
import { createIntakeAction, type IntakeResult } from "./actions";
import styles from "./page.module.css";

export function NewSourceForm({ extraction }: { extraction: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<IntakeResult | null, FormData>(createIntakeAction, null);
  return (
    <div className={styles.validate}>
      <div className={styles.vHead}>
        <h2 className="display">{t("Nouvelle source")}</h2>
      </div>
      {/* LE STRICT MINIMUM (20 novembre 2026, le client : « alléger au strict minimum l'encadré »). Un fichier ou un texte, et c'est tout : le titre vient de la pièce, la provenance est le nom de qui dépose, et la consigne n'a jamais servi. */}
      <form action={action} className={styles.newForm}>
        <label className="field">
          {t("Fichier (PDF, JPEG, PNG, WebP : 20 Mo max)")}
          <input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
        </label>
        <label className="field">
          {t("… ou collez le texte du message / de l'e-mail")}
          <textarea name="text" rows={5} placeholder={t("Collez ici le corps du communiqué ou de l'e-mail reçu.")} />
        </label>
        {state && !state.ok && <div className={styles.error}>{state.error}</div>}
        <div className={styles.vFoot}>
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? (extraction ? "Extraction en cours…" : "Enregistrement…") : "Déposer et extraire"}
          </button>
        </div>
      </form>
    </div>
  );
}
