"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import type { OfferDocument } from "@/lib/domain/types";
import { attachDocumentAction, removeDocumentAction, type RestoreResult } from "./actions";
import styles from "./page.module.css";

/**
 * The documents a client sees on the line: each one is a real file the desk
 * attached (communiqué, note d'information, teaser), kept in the « sources »
 * bucket and served from the line. No entry without a file.
 */
export function DocumentsForm({ offerId, current, documents }: { offerId: string; current: number; documents: OfferDocument[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<RestoreResult | null, FormData>(attachDocumentAction, null);
  const [rState, rAction, rPending] = useActionState<RestoreResult | null, FormData>(removeDocumentAction, null);
  return (
    <div className={styles.docs}>
      {documents.length > 0 ? (
        <ul className={styles.docList}>
          {documents.map((d, n) => (
            <li key={`${d.name}-${n}`}>
              {d.url || d.fileKey ? (
                <a href={d.url ?? `/offres/${offerId}/doc/${n}`} target="_blank" rel="noreferrer">
                  {d.name}
                </a>
              ) : (
                <span className={styles.noFile}>{d.name}</span>
              )}
              <small className="muted">
                {" "}
                · {d.meta}
                {d.addedBy ? ` · ${d.addedBy}` : ""}
                {!d.url && !d.fileKey ? ` · ${t("sans fichier : à retirer ou à joindre")}` : ""}
              </small>
              <form action={rAction} className={styles.inline}>
                <input type="hidden" name="offerId" value={offerId} />
                <input type="hidden" name="current" value={current} />
                <input type="hidden" name="index" value={n} />
                <button type="submit" className="btn sm ghost" disabled={rPending}>
                  {t("Retirer")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t("Aucun document sur cette ligne : la fiche client n'en promet aucun.")}</p>
      )}
      {rState && <p className={rState.ok ? styles.ok : styles.err}>{rState.ok ? rState.message : rState.error}</p>}
      <form action={action} className={styles.attach}>
        <input type="hidden" name="offerId" value={offerId} />
        <input type="hidden" name="current" value={current} />
        <label>
          <span>{t("Titre affiché au client")}</span>
          <input name="name" required maxLength={90} placeholder={t("Communiqué d'annonce n° …, Note d'information, Teaser")} />
        </label>
        <label>
          <span>{t("Fichier (PDF ou image, 15 Mo max)")}</span>
          <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required />
        </label>
        <button type="submit" className="btn sm primary" disabled={pending}>
          {pending ? "…" : t("Joindre le document")}
        </button>
      </form>
      {state && <p className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</p>}
    </div>
  );
}
