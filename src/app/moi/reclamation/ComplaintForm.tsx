"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { complaintDepositAction, complaintPrepareAction, type ComplaintStep } from "./actions";
import { BarreDEtape } from "@/components/mobile/BarreDEtape";
import barre from "@/components/mobile/BarreDEtape.module.css";
import styles from "./page.module.css";

export function ComplaintForm({ ops, phone, email }: { ops: { ref: string; label: string }[]; phoneProven: boolean; phone?: string; email?: string }) {
  const t = useT();
  const [facts, setFacts] = useState("");
  const [ask, setAsk] = useState("");
  const [operation, setOperation] = useState("");
  const [code, setCode] = useState("");
  const [confirme, setConfirme] = useState(false);
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
            <Select block name="operation" value={operation} onChange={setOperation} options={[{ value: "", label: t("Aucune opération en particulier") }, ...ops.map((o) => ({ value: o.ref, label: o.label, hint: o.ref }))]} />
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
          {/* COLLANTE EN BAS, GRISÉE TANT QUE LES FAITS ET LA DEMANDE MANQUENT (10 novembre 2026) ; « Retour » ramène à la page précédente. */}
          <BarreDEtape indice={facts.trim().length >= 10 && ask.trim().length >= 5 ? undefined : t("Décrivez les faits et ce que vous demandez.")}>
            <button type="button" className={`btn ${barre.retour}`} onClick={() => window.history.back()}>
              {t("Retour")}
            </button>
            <button type="submit" className={`btn primary ${barre.suivant}`} disabled={preparing || facts.trim().length < 10 || ask.trim().length < 5}>
              {preparing ? "…" : t("Continuer")}
            </button>
          </BarreDEtape>
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
              <input name="code" inputMode="numeric" maxLength={6} pattern="\d{6}" required className={styles.code} placeholder="000000" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
              {prep?.ok && prep.step === "code" && prep.demoCode && <small className="muted">{t("Démonstration : code {c}", { c: prep.demoCode })}</small>}
            </label>
          ) : (
            <label className={styles.check}>
              <input type="checkbox" name="confirm" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} /> {t("Je signe cette réclamation avec mon e-mail de connexion ({e}).", { e: email ?? "" })}
            </label>
          )}
          <p className="muted">{t("Purpose Capital accuse réception et vous répond dans un délai raisonnable. Vous recevez une copie signée dans Mes documents.")}</p>
          {dep && !dep.ok && <p className={styles.err}>{dep.error}</p>}
          <BarreDEtape indice={(channel === "whatsapp" ? /^\d{6}$/.test(code) : confirme) ? undefined : t(channel === "whatsapp" ? "Saisissez le code à six chiffres reçu sur WhatsApp." : "Cochez la case pour signer.")}>
            <button type="button" className={`btn ${barre.retour}`} onClick={() => window.location.reload()}>
              {t("Modifier")}
            </button>
            <button type="submit" className={`btn primary ${barre.suivant}`} disabled={depositing || !(channel === "whatsapp" ? /^\d{6}$/.test(code) : confirme)}>
              {depositing ? "…" : t("Déposer la réclamation")}
            </button>
          </BarreDEtape>
        </form>
      )}

      {step === 3 && dep?.ok && dep.step === "done" && (
        <div className={styles.done}>
          <p>
            <b>{t("Réclamation déposée")} · {dep.number}</b>
          </p>
          <p>{t("Nous accusons réception de votre réclamation et vous répondrons dans un délai raisonnable. La copie signée est dans Mes documents.")}</p>
          <div className={styles.foot}>
            <a className="btn sm primary" href={`/moi/documents/${dep.id}`}>
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
