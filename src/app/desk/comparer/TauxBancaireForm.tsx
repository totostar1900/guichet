"use client";

import { useActionState } from "react";
import { Info } from "@/components/Info";
import { useT } from "@/i18n/client";
import { fixerTauxBancaire, type TauxResult } from "./actions";
import styles from "./taux.module.css";

/** Le taux bancaire de référence, au desk : un champ, un bouton, la date de la dernière décision. */
export function TauxBancaireForm({ pct, on, peutFixer }: { pct?: number; on?: string; peutFixer: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<TauxResult | null, FormData>(fixerTauxBancaire, null);
  return (
    <form action={action} className={styles.form}>
      <label htmlFor="taux-bancaire">
        {t("Taux bancaire de référence")} <Info term="taux_bancaire" />
      </label>
      <input id="taux-bancaire" name="pct" inputMode="decimal" defaultValue={pct != null ? String(pct).replace(".", ",") : ""} placeholder="2,0" required readOnly={!peutFixer} aria-describedby="taux-bancaire-aide" />
      <span aria-hidden>%</span>
      {peutFixer ? (
        <button className="btn sm" type="submit" disabled={pending}>
          {t("Fixer le taux")}
        </button>
      ) : (
        <span className={styles.aide}>{t("Réservé au responsable.")}</span>
      )}
      <p id="taux-bancaire-aide" className={styles.aide}>
        {pct != null && on ? t("Valorise le temps sans placement d'un bon roulé, dans le comparatif sur une période. Arrêté à {p} % le {d} ; le client peut y mettre le sien.", { p: String(pct).replace(".", ","), d: on }) : t("Non renseigné : sans référence, le temps sans placement est valorisé à zéro, et le comparatif le dit.")}
      </p>
      {state && <p className={state.ok ? styles.fait : styles.erreur} role="status">{state.ok ? t(state.message) : t(state.error)}</p>}
    </form>
  );
}
