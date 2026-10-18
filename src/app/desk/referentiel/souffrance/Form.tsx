"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { DelaiDeSouffrance } from "@/lib/domain/souffrance";
import { enregistrerDelaiAction, type DelaiResult } from "./actions";
import styles from "./page.module.css";

/**
 * DEUX NOMBRES, ET CE QU'ILS DÉPLACENT, CÔTE À CÔTE.
 *
 * Le barème de l'activité se publie en voyant qui bouge, et la raison vaut
 * ici aussi : un seuil se juge par ce qu'il attrape, jamais dans l'abstrait.
 * « Sept jours » ne dit rien ; « sept jours, soit deux ordres sur trois » dit
 * tout, et se corrige avant d'enregistrer plutôt qu'après.
 *
 * Le compte se recalcule pendant la saisie, sans aller-retour : les attentes
 * sont déjà là, et demander au serveur de recompter ce que le navigateur sait
 * ferait clignoter le chiffre à chaque frappe.
 */
export function DelaiForm({ delai, attentes }: { delai: DelaiDeSouffrance; attentes: { ref: string; jours: number; avantCloture?: number }[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<DelaiResult | null, FormData>(enregistrerDelaiAction, null);
  const [jours, setJours] = useState(String(delai.jours));
  const [avant, setAvant] = useState(String(delai.avantCloture));

  const j = Number(jours);
  const a = Number(avant);
  const pris = Number.isFinite(j) && Number.isFinite(a) ? attentes.filter((x) => x.jours >= j || (x.avantCloture != null && x.avantCloture <= a)) : [];

  return (
    <form action={action} className={styles.form}>
      <div className={styles.grid}>
        <label>
          <span>{t("Sans mouvement : au-delà de combien de jours")}</span>
          <input name="jours" type="number" min="1" max="120" step="1" value={jours} onChange={(e) => setJours(e.target.value)} />
        </label>
        <label>
          <span>{t("Clôture proche : à combien de jours de la limite")}</span>
          <input name="avantCloture" type="number" min="0" max="30" step="1" value={avant} onChange={(e) => setAvant(e.target.value)} />
        </label>
      </div>

      <div className={styles.effet}>
        <b>{t("{n} ordre(s) ouvert(s) seraient marqués", { n: pris.length })}</b>
        <span className="muted">{t("sur {n} ouvert(s) au total", { n: attentes.length })}</span>
        {pris.length > 0 && (
          <ul>
            {pris.slice(0, 8).map((x) => (
              <li key={x.ref}>
                <span className="mono">{x.ref}</span>{" "}
                <span className="muted">
                  {t("{n} jours", { n: x.jours })}
                  {x.avantCloture != null && x.avantCloture <= a ? ` · ${t("clôture dans {n} jours", { n: x.avantCloture })}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.row}>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {t(pending ? "…" : "Enregistrer le délai")}
        </button>
        {state && <span className={state.ok ? styles.ok : styles.ko}>{state.ok ? t(state.message) : t(state.error)}</span>}
      </div>
    </form>
  );
}
