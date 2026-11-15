"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { saisirLeRecu, type RecuResult } from "./actions";
import styles from "./page.module.css";

/** Le reçu d'une source pour un mois : la somme arrivée, et le jour. */
export function RecuForm({ source, mois, montant, le, aujourdHui }: { source: string; mois: string; montant?: number; le?: string; aujourdHui: string }) {
  const t = useT();
  const [res, action, pending] = useActionState<RecuResult | null, FormData>(saisirLeRecu, null);
  return (
    <form action={action} className={styles.pied}>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="mois" value={mois} />
      <label className={styles.champ}>
        <span>{t("Reçu (FCFA)")}</span>
        <input name="montant" type="number" min={0} step={1} defaultValue={montant ?? ""} inputMode="numeric" required />
      </label>
      <label className={styles.champ}>
        <span>{t("Arrivé le")}</span>
        <input name="le" type="date" defaultValue={le ?? aujourdHui} required />
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? t("Enregistrement…") : t("Enregistrer")}
      </button>
      {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
    </form>
  );
}
