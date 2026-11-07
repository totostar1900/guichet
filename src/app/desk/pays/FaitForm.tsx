"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { ajouterFait, type PaysResult } from "./actions";
import styles from "./page.module.css";

const GENRES: [string, string][] = [
  ["notation", "Notation d'une agence"],
  ["chiffre", "Chiffre des comptes"],
];

/** Un fait saisi, avec sa date et le lien de sa pièce. Aucun champ de commentaire : la fiche ne montre que des faits. */
export function FaitForm({ entite, institution }: { entite: string; institution: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<PaysResult | null, FormData>(ajouterFait, null);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="entite" value={entite} />
      <label>
        {t("Nature du fait")}
        <select name="genre" defaultValue={institution ? "chiffre" : "notation"}>
          {GENRES.map(([g, l]) => (
            <option key={g} value={g}>
              {t(l)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Qui le dit")}
        <input name="organisme" placeholder="S&P, Moody's, Fitch, FMI, Trésor…" required />
      </label>
      <label>
        {t("Valeur, telle que la pièce l'écrit")}
        <input name="valeur" placeholder="B-, Baa3, risque de surendettement élevé…" required />
      </label>
      <label>
        {t("Perspective ou libellé")}
        <input name="perspective" placeholder={t("stable, négative… ou le nom du chiffre")} />
      </label>
      <label>
        {t("Unité")}
        <input name="unite" placeholder="Md FCFA, %…" />
      </label>
      <label>
        {t("Date du fait")}
        <input name="dateFait" type="date" required />
      </label>
      <label className={styles.large}>
        {t("Lien de la pièce (https)")}
        <input name="url" type="url" placeholder="https://" required />
      </label>
      <div className={styles.actions}>
        <button className="btn primary" type="submit" disabled={pending}>
          {t("Enregistrer le fait")}
        </button>
        {state && <span className={state.ok ? styles.fait : styles.erreur} role="status">{state.ok ? t(state.message) : t(state.error)}</span>}
      </div>
    </form>
  );
}
