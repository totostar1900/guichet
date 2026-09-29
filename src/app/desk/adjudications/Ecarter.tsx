"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { MOTIFS_ECART } from "@/lib/market/auction-results";
import { restoreResultAction, setAsideResultAction } from "./actions";
import styles from "./page.module.css";

/**
 * Ranger une pièce qui n'est pas un résultat, et pouvoir la reprendre.
 *
 * Le geste s'ouvre avant de s'exécuter : il demande un motif, et le motif est
 * tout l'intérêt. « Écarté » sans raison se lit six mois plus tard comme une
 * erreur ou comme une décision, et personne ne sait laquelle.
 *
 * Il ne porte pas de rouge et n'appelle pas à la prudence : rien ne se perd. Le
 * communiqué reste archivé, la ligne reste, et le bouton d'à côté la remet dans
 * la file. Une commande réversible ne doit pas s'habiller comme une commande
 * irréversible, sans quoi on hésite là où il n'y a pas lieu.
 */
export function Ecarter({ id, ecartee, motif, par }: { id: string; ecartee: boolean; motif?: string; par?: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);

  if (ecartee) {
    return (
      <div className={styles.ecarteBloc}>
        <p className={styles.ecarteMot}>
          <b>{t("Pièce écartée")}</b> · {motif ? t(motif) : ""}
          {par ? ` · ${par}` : ""}
        </p>
        <p className="muted">
          {t(
            "Elle ne compte ni dans la file de relecture, ni dans les analyses, ni dans la courbe. Le communiqué reste archivé et son lien fonctionne.",
          )}
        </p>
        <form action={restoreResultAction}>
          <input type="hidden" name="id" value={id} />
          <button className="btn sm" type="submit" formNoValidate>
            {t("Remettre dans la file")}
          </button>
        </form>
      </div>
    );
  }

  if (!ouvert)
    return (
      <button className="btn sm ghost" type="button" onClick={() => setOuvert(true)}>
        {t("Ce n'est pas un résultat")}
      </button>
    );

  return (
    <form action={setAsideResultAction} className={styles.ecarteForm}>
      <input type="hidden" name="id" value={id} />
      <label>
        <span>{t("Pourquoi cette pièce n'est pas un résultat")}</span>
        <select name="motif" defaultValue={MOTIFS_ECART[0]}>
          {MOTIFS_ECART.map((m) => (
            <option key={m} value={m}>
              {t(m)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Précision, si elle aide le prochain lecteur")}</span>
        <input name="precision" type="text" maxLength={140} placeholder={t("facultatif")} />
      </label>
      <div className={styles.ecarteActions}>
        <button className="btn sm" type="submit" formNoValidate>
          {t("Écarter cette pièce")}
        </button>
        <button className="btn sm ghost" type="button" onClick={() => setOuvert(false)}>
          {t("Annuler")}
        </button>
      </div>
      <p className="muted">{t("Rien n'est supprimé : la ligne et le communiqué restent, et le geste se défait d'un bouton.")}</p>
    </form>
  );
}
