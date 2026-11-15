"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { attribuerLesCodes, saisirLeReleve, type RegistreResult } from "./actions";
import styles from "./page.module.css";

/** Attribuer un code à chaque porteur qui n'en a pas : un geste, irréversible dans ses effets (le code ne change plus), donc nommé et compté. */
export function CodesForm({ sansCode }: { sansCode: number }) {
  const t = useT();
  const [res, action, pending] = useActionState<RegistreResult | null, FormData>(() => attribuerLesCodes(), null);
  return (
    <form action={action} className={styles.pied}>
      <button className="btn primary" type="submit" disabled={pending || sansCode === 0}>
        {pending ? t("Attribution…") : sansCode === 0 ? t("Chaque porteur a son code") : t("Attribuer {n} code(s)", { n: String(sansCode) })}
      </button>
      {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
    </form>
  );
}

/** Le relevé du compte global chez le gestionnaire : le total de parts de la maison, à une date. */
export function ReleveForm({ offerId, parts, au, aujourdHui }: { offerId: string; parts?: number; au?: string; aujourdHui: string }) {
  const t = useT();
  const [res, action, pending] = useActionState<RegistreResult | null, FormData>(saisirLeReleve, null);
  return (
    <form action={action} className={styles.pied}>
      <input type="hidden" name="offerId" value={offerId} />
      <label className={styles.champ}>
        <span>{t("Parts au relevé du gestionnaire")}</span>
        <input name="parts" type="number" min={0} step={0.001} defaultValue={parts ?? ""} inputMode="decimal" required />
      </label>
      <label className={styles.champ}>
        <span>{t("Au")}</span>
        <input name="au" type="date" defaultValue={au ?? aujourdHui} required />
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? t("Enregistrement…") : t("Enregistrer le relevé")}
      </button>
      {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
    </form>
  );
}
