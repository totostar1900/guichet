"use client";

import { useActionState, useId, useState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { useT } from "@/i18n/client";
import { MESSAGE_MAX, MESSAGE_MIN } from "@/lib/domain/statuts";
import { ajouterStatutAction, deplacerStatutAction, publierMessageAction, retirerStatutAction, type StatutResult } from "./actions";
import styles from "./page.module.css";

/** Le message de la première page : une phrase, puis une seconde question qui redit ce que les clients liront. */
export function FormulaireMessage({ actuel }: { actuel: string }) {
  const t = useT();
  const id = useId();
  const [state, action, pending] = useActionState<StatutResult | null, FormData>(publierMessageAction, null);
  const [texte, setTexte] = useState(actuel);
  const propre = texte.trim();
  return (
    <form id={id} action={action} className={styles.formulaire}>
      <label>
        <span>{t("Le message de la première page")}</span>
        <textarea name="texte" rows={3} maxLength={MESSAGE_MAX} value={texte} onChange={(e) => setTexte(e.target.value)} required />
        <small className={styles.compte}>
          {propre.length} / {MESSAGE_MAX}
        </small>
      </label>
      <ConfirmPublish
        form={id}
        label={t("Enregistrer le message")}
        title={t("Changer le message des statuts ?")}
        lines={[t("« {a} » s'affiche sur la première page des statuts, pour tous les clients, dès maintenant.", { a: propre || "—" })]}
        confirmLabel={t("Enregistrer maintenant")}
        disabled={propre.length < MESSAGE_MIN}
        pending={pending}
      />
      {state && !state.ok && <small className={styles.err}>{state.error}</small>}
    </form>
  );
}

/** Une ligne retenue : monter, descendre, retirer (avec une seconde question). */
export function GestesDeLaLigne({ offerId, titre, premiere, derniere }: { offerId: string; titre: string; premiere: boolean; derniere: boolean }) {
  const t = useT();
  const formId = useId();
  return (
    <span className={styles.gestes}>
      <form action={deplacerStatutAction}>
        <input type="hidden" name="offerId" value={offerId} />
        <input type="hidden" name="sens" value="haut" />
        <button type="submit" className="btn sm ghost" disabled={premiere} aria-label={t("Monter")} title={t("Monter")}>
          ↑
        </button>
      </form>
      <form action={deplacerStatutAction}>
        <input type="hidden" name="offerId" value={offerId} />
        <input type="hidden" name="sens" value="bas" />
        <button type="submit" className="btn sm ghost" disabled={derniere} aria-label={t("Descendre")} title={t("Descendre")}>
          ↓
        </button>
      </form>
      <form id={formId} action={retirerStatutAction}>
        <input type="hidden" name="offerId" value={offerId} />
        <ConfirmPublish
          form={formId}
          className="btn sm ghost"
          label={t("Retirer")}
          title={t("Retirer des statuts ?")}
          lines={[t("« {a} » disparaît de la rangée des statuts : les clients ne la voient plus.", { a: titre }), t("Elle reste au journal, avec la date et le nom de qui l'a retirée.")]}
          confirmLabel={t("Retirer des statuts")}
        />
      </form>
    </span>
  );
}

/** Ajouter une ligne : une liste de lignes que les clients peuvent lire, et un bouton. */
export function AjouterUneLigne({ candidates, plein }: { candidates: { id: string; titre: string }[]; plein: boolean }) {
  const t = useT();
  return (
    <form action={ajouterStatutAction} className={styles.ajout}>
      <label>
        <span>{t("Une ligne à mettre dans les statuts")}</span>
        <select name="offerId" required defaultValue="" disabled={plein || candidates.length === 0}>
          <option value="" disabled>
            {t("Choisir une ligne")}
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titre}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn primary" disabled={plein || candidates.length === 0}>
        {t("Ajouter aux statuts")}
      </button>
    </form>
  );
}
