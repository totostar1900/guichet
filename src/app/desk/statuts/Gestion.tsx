"use client";

import { useActionState, useId, useState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { useT } from "@/i18n/client";
import { ajouterStatutAction, deplacerStatutAction, importerMessagesAction, retirerStatutAction, type ImportResult } from "./actions";
import styles from "./page.module.css";

/** Le tableau des messages : le télécharger, le renvoyer. Renvoyer REMPLACE la base ; une seconde question le redit, et une erreur refuse tout le fichier. */
export function TableauDesMessages({ actifs, fr, en, parDefaut }: { actifs: number; fr: number; en: number; parDefaut: boolean }) {
  const t = useT();
  const id = useId();
  const [state, action, pending] = useActionState<ImportResult | null, FormData>(importerMessagesAction, null);
  const [nom, setNom] = useState("");
  return (
    <div className={styles.messages}>
      <p>
        <b>{actifs}</b> {t("messages en jeu")} · {fr} fr · {en} en {parDefaut ? <small className={styles.compte}>· {t("la base de départ, pas encore importée")}</small> : null}
      </p>
      <a className="btn" href="/desk/statuts/messages" download>
        {t("Télécharger le tableau (.xlsx)")}
      </a>
      <form id={id} action={action} className={styles.formulaire}>
        <label>
          <span>{t("Renvoyer le tableau complété")}</span>
          <input type="file" name="tableau" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setNom(e.target.files?.[0]?.name ?? "")} required />
        </label>
        <ConfirmPublish
          form={id}
          label={t("Importer le tableau")}
          title={t("Remplacer la base des messages ?")}
          lines={[t("Le tableau « {n} » remplace la base : un message qui n'y est plus sort de la première page.", { n: nom || "—" }), t("Rien n'est effacé : un message retiré reste au journal, avec la date et le nom de qui l'a retiré."), t("Un seul message refusé, et rien n'est importé.")]}
          confirmLabel={t("Importer maintenant")}
          disabled={!nom}
          pending={pending}
        />
        {state && !state.ok && (
          <ul className={styles.err}>
            {state.erreurs.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </form>
    </div>
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
