"use client";

import { useActionState, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { TemplateText } from "@/lib/domain/types";
import { PLACEHOLDER_LABEL, type PassageDef, type TemplateScope } from "@/lib/documents/passages-catalog";
import { activateModelTextAction, resetModelTextAction, saveModelTextAction, type ModelResult } from "./actions";
import styles from "./page.module.css";

/**
 * The editor of one passage: the two languages side by side, the
 * placeholders as chips that insert themselves, a note for the logbook, a
 * preview of the whole document with the draft, then « Proposer » (or
 * « Enregistrer » when the passage is free). Below, the history: every
 * superseded version, each with « Revenir à cette version ».
 */
export function PassageEditor({ docType, def, current, versions, responsable, me }: { docType: TemplateScope; def: PassageDef; current?: TemplateText; versions: TemplateText[]; responsable: boolean; me: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [fr, setFr] = useState(current?.fr ?? def.fr);
  const [en, setEn] = useState(current?.en || def.en);
  const frRef = useRef<HTMLTextAreaElement>(null);
  const [state, action, pending] = useActionState<ModelResult | null, FormData>(saveModelTextAction, null);
  const [resetState, resetAction, resetting] = useActionState<ModelResult | null, FormData>(resetModelTextAction, null);
  void me;
  const insert = (k: string) => {
    const ta = frRef.current;
    const tag = `{${k}}`;
    if (!ta) return setFr((v) => v + tag);
    const a = ta.selectionStart ?? fr.length;
    const b = ta.selectionEnd ?? fr.length;
    setFr(fr.slice(0, a) + tag + fr.slice(b));
    window.setTimeout(() => ta.setSelectionRange(a + tag.length, a + tag.length), 0);
  };
  const previewHref = `/desk/referentiel/modeles/preview?type=${docType}&passage=${encodeURIComponent(def.key)}&fr=${encodeURIComponent(fr)}`;
  return (
    <div className={styles.editor}>
      {!open ? (
        <div className={styles.editorBar}>
          <button type="button" className="btn sm" onClick={() => setOpen(true)}>
            {t("Modifier ce passage")}
          </button>
          {versions.length > 0 && (
            <details className={styles.history}>
              <summary>
                {t("Historique")} · {versions.length}
              </summary>
              <ul>
                {versions.map((v) => (
                  <li key={v.id}>
                    <div>
                      <b>
                        v{v.version} · {v.by} · {new Date(v.at).toLocaleString("fr-FR")}
                      </b>
                      {v.note && <small> · {v.note}</small>}
                      <p>{v.fr}</p>
                    </div>
                    <ActivateVersion id={v.id} can={def.sensitivity === "libre" || def.sensitivity === "relu" || responsable} label={t("Revenir à cette version")} previewHref={docType === "message" ? undefined : `/desk/referentiel/modeles/preview?type=${docType}&v=${v.id}`} />
                  </li>
                ))}
              </ul>
            </details>
          )}
          {current && responsable && (
            <form action={resetAction}>
              <input type="hidden" name="docType" value={docType} />
              <input type="hidden" name="passage" value={def.key} />
              <button type="submit" className="btn sm ghost" disabled={resetting}>
                {t("Rétablir le texte d'origine")}
              </button>
              {resetState && <small className={resetState.ok ? styles.ok : styles.err}>{resetState.ok ? resetState.message : resetState.error}</small>}
            </form>
          )}
        </div>
      ) : (
        <form action={action} className={styles.form}>
          <input type="hidden" name="docType" value={docType} />
          <input type="hidden" name="passage" value={def.key} />
          {def.placeholders.length > 0 && (
            <div className={styles.chips}>
              <span>{t("Champs")} :</span>
              {def.placeholders.map((k) => (
                <button key={k} type="button" className={styles.chip} title={PLACEHOLDER_LABEL[k] ?? k} onClick={() => insert(k)}>
                  {`{${k}}`}
                  {def.required?.includes(k) ? " *" : ""}
                </button>
              ))}
              <small>{t("* obligatoire dans ce passage")}</small>
            </div>
          )}
          <label>
            <span>{t("Français")}</span>
            <textarea ref={frRef} name="fr" value={fr} onChange={(e) => setFr(e.target.value)} rows={4} required />
          </label>
          <label>
            <span>{t("Anglais")}</span>
            <textarea name="en" value={en} onChange={(e) => setEn(e.target.value)} rows={4} required />
          </label>
          <label>
            <span>{t("Note pour l'historique")}</span>
            <input name="note" placeholder={t("ce qui change, et pourquoi")} maxLength={120} />
          </label>
          <div className={styles.formFoot}>
            {docType !== "message" && (
              <a className="btn sm" href={previewHref} target="_blank" rel="noreferrer">
                {t("Aperçu PDF avec ce texte")}
              </a>
            )}
            <span className={styles.spacer} />
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                setOpen(false);
                setFr(current?.fr ?? def.fr);
                setEn(current?.en || def.en);
              }}
            >
              {t("Annuler")}
            </button>
            <button type="submit" className="btn sm primary" disabled={pending}>
              {t(pending ? "…" : def.sensitivity === "libre" ? "Enregistrer : en vigueur" : "Proposer cette version")}
            </button>
          </div>
          {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
        </form>
      )}
    </div>
  );
}

/** The one button that makes a version current, with a preview link beside it. */
export function ActivateVersion({ id, can, label, previewHref }: { id: string; can: boolean; label: string; previewHref?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<ModelResult | null, FormData>(activateModelTextAction, null);
  return (
    <form action={action} className={styles.activate}>
      <input type="hidden" name="id" value={id} />
      {previewHref && (
        <a className="btn sm ghost" href={previewHref} target="_blank" rel="noreferrer">
          {t("Aperçu")}
        </a>
      )}
      <button type="submit" className="btn sm" disabled={!can || pending} title={can ? undefined : t("réservé à un autre membre du desk ou à un responsable")}>
        {label}
      </button>
      {state && <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}
