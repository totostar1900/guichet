"use client";

import { useActionState } from "react";
import { createIntakeAction, type IntakeResult } from "./actions";
import styles from "./page.module.css";

export function NewSourceForm({ extraction }: { extraction: boolean }) {
  const [state, action, pending] = useActionState<IntakeResult | null, FormData>(createIntakeAction, null);
  return (
    <div className={styles.validate}>
      <div className={styles.vHead}>
        <h2 className="display">Nouvelle source</h2>
        <span className="muted" style={{ fontSize: ".8rem" }}>
          Communiqué, teaser, e-mail transféré, photo d&apos;écran… {extraction ? "Les champs sont extraits automatiquement, puis vérifiés par vous." : "Les champs seront à renseigner à la main."}
        </span>
      </div>
      <form action={action} className={styles.newForm}>
        <div className={styles.newGrid}>
          <label className="field">
            Fichier (PDF, JPEG, PNG, WebP — 20 Mo max)
            <input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
          </label>
          <label className="field">
            Titre (facultatif)
            <input name="title" placeholder="Ex. Communiqué OTA Cameroun — n° …" />
          </label>
          <label className="field">
            Reçu de (facultatif)
            <input name="from" placeholder="Ex. dgtcfm@minfi.gov.cm · lun. 14 sept. 10:15" />
          </label>
          <label className="field">
            Consigne pour l&apos;extraction (facultatif)
            <input name="hint" placeholder="Ex. « ligne 3 ans uniquement » ou « c'est un rachat »" />
          </label>
        </div>
        <label className="field">
          … ou collez le texte du message / de l&apos;e-mail
          <textarea name="text" rows={10} placeholder="Collez ici le corps du communiqué ou de l'e-mail reçu." />
        </label>
        {state && !state.ok && <div className={styles.error}>{state.error}</div>}
        <div className={styles.vFoot}>
          <small>L&apos;original est conservé tel quel : c&apos;est la pièce justificative de l&apos;offre.</small>
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? (extraction ? "Extraction en cours…" : "Enregistrement…") : "Déposer et extraire"}
          </button>
        </div>
      </form>
    </div>
  );
}
