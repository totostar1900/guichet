"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { inviterUnGestionnaire, type GestionnaireResult } from "./actions";
import styles from "./page.module.css";

/** Le formulaire d'invitation : une adresse, une personne, les sociétés de gestion lues. */
export function FormulaireDInvitation() {
  const t = useT();
  const [res, action, pending] = useActionState<GestionnaireResult | null, FormData>(inviterUnGestionnaire, null);
  return (
    <form action={action} className={styles.form}>
      <label className={styles.champ}>
        <span>{t("Adresse e-mail")}</span>
        <input name="email" type="email" required autoComplete="off" />
      </label>
      <label className={styles.champ}>
        <span>{t("Nom de la personne")}</span>
        <input name="nom" required minLength={2} />
      </label>
      <label className={styles.champ}>
        <span>{t("Sociétés de gestion lues (au nom du bulletin, séparées par une virgule)")}</span>
        <input name="gestionnaires" required minLength={2} placeholder="Corridor Asset Management" />
      </label>
      <div className={styles.pied}>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? t("Enregistrement…") : t("Inviter")}
        </button>
        {res && <span className={res.ok ? styles.ok : styles.ko}>{t(res.ok ? res.message : res.error)}</span>}
      </div>
    </form>
  );
}
