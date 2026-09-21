"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmtDate } from "@/lib/format";
import { complaintDepositAction, complaintPrepareAction, type ComplaintStep } from "./actions";
import styles from "./page.module.css";

export function ComplaintForm({ ops, phoneProven, phone, email }: { ops: { ref: string; label: string }[]; phoneProven: boolean; phone?: string; email?: string }) {
  const t = useT();
  const [facts, setFacts] = useState("");
  const [ask, setAsk] = useState("");
  const [operation, setOperation] = useState("");
  const [prep, prepare, preparing] = useActionState<ComplaintStep | null, FormData>(complaintPrepareAction, null);
  const [dep, deposit, depositing] = useActionState<ComplaintStep | null, FormData>(complaintDepositAction, null);
  const step = dep?.ok && dep.step === "done" ? 3 : prep?.ok && prep.step === "code" ? 2 : 1;
  const channel = prep?.ok && prep.step === "code" ? prep.channel : "email";
  return (
    <div className={styles.card}>
      <ol className={styles.stepper} aria-label={t("Étapes")}>
        <li aria-current={step === 1 ? "step" : undefined}>1 · {t("Les faits")}</li>
        <li aria-current={step === 2 ? "step" : undefined}>2 · {t("Signature")}</li>
        <li aria-current={step === 3 ? "step" : undefined}>3 · {t("Déposée")}</li>
      </ol>

      {step === 1 && (
        <form action={prepare} className={styles.form}>
          <label>
            <span>{t("Quelle opération ?")}</span>
            <select name="operation" value={operation} onChange={(e) => setOperation(e.target.value)}>
              <option value="">{t("Aucune opération en particulier")}</option>
              {ops.map((o) => (
                <option key={o.ref} value={o.ref}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Que s'est-il passé ?")}</span>
            <textarea name="facts" rows={5} value={facts} onChange={(e) => setFacts(e.target.value)} required minLength={10} placeholder={t("Les dates, les montants, ce que vous attendiez et ce qui est arrivé.")} />
          </label>
          <label>
            <span>{t("Que demandez-vous ?")}</span>
            <textarea name="ask" rows={3} value={ask} onChange={(e) => setAsk(e.target.value)} required minLength={5} placeholder={t("Une explication, une correction, un remboursement…")} />
          </label>
          {prep && !prep.ok && <p className={styles.err}>{prep.error}</p>}
          <div className={styles.foot}>
            <Link className="btn sm ghost" href="/moi">
              {t("Annuler")}
            </Link>
            <button type="submit" className="btn sm primary" disabled={preparing}>
              {preparing ? "…" : t("Continuer")}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form action={deposit} className={styles.form}>
          <input type="hidden" name="facts" value={facts} />
          <input type="hidden" name="ask" value={ask} />
          <input type="hidden" name="operation" value={operation} />
          <input type="hidden" name="channel" value={channel} />
          <div className={styles.recap}>
            {operation && (
              <p>
                <b>{t("Opération")}.</b> {ops.find((o) => o.ref === operation)?.label}
              </p>
            )}
            <p>
              <b>{t("Les faits")}.</b> {facts}
            </p>
            <p>
              <b>{t("La demande")}.</b> {ask}
            </p>
          </div>
          {channel === "whatsapp" ? (
            <label>
              <span>{t("Signez avec le code reçu sur WhatsApp ({p})", { p: phone ?? "" })}</span>
              <input name="code" inputMode="numeric" maxLength={6} pattern="\d{6}" required className={styles.code} placeholder="000000" autoComplete="one-time-code" />
              {prep?.ok && prep.step === "code" && prep.demoCode && <small className="muted">{t("Démonstration : code {c}", { c: prep.demoCode })}</small>}
            </label>
          ) : (
            <label className={styles.check}>
              <input type="checkbox" name="confirm" /> {t("Je signe cette réclamation avec mon e-mail de connexion ({e}).", { e: email ?? "" })}
            </label>
          )}
          <p className="muted">{t("Purpose Capital accuse réception sous deux jours ouvrés et répond sous trente jours. Vous recevez une copie signée dans Mes documents.")}</p>
          {dep && !dep.ok && <p className={styles.err}>{dep.error}</p>}
          <div className={styles.foot}>
            <button type="button" className="btn sm ghost" onClick={() => window.location.reload()}>
              {t("Modifier")}
            </button>
            <button type="submit" className="btn sm primary" disabled={depositing}>
              {depositing ? "…" : t("Déposer la réclamation")}
            </button>
          </div>
        </form>
      )}

      {step === 3 && dep?.ok && dep.step === "done" && (
        <div className={styles.done}>
          <p>
            <b>{t("Réclamation déposée")} · {dep.number}</b>
          </p>
          <p>{t("Accusé de réception au plus tard le {a} ; réponse au plus tard le {b}. La copie signée est dans Mes documents.", { a: fmtDate(dep.ackBy), b: fmtDate(dep.answerBy) })}</p>
          <div className={styles.foot}>
            <a className="btn sm primary" href={`/desk/documents/pdf/${dep.id}`} target="_blank" rel="noreferrer">
              {t("Voir le document")}
            </a>
            <Link className="btn sm" href="/moi#documents">
              {t("Mes documents")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
