"use client";

import { useActionState } from "react";
import type { ClientFile, RiskRating } from "@/lib/domain/kyc";
import { DOC_LABEL } from "@/lib/kyc/checklist";
import { autoScreenAction, reviewAction, setCustodianAccountAction, type ReviewResult } from "./actions";
import styles from "./page.module.css";

function AccountForm({ file }: { file: ClientFile }) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(setCustodianAccountAction, null);
  return (
    <form action={action} className={styles.review}>
      <input type="hidden" name="fileId" value={file.id} />
      <h3>Sous-compte nominatif chez le SVT</h3>
      <p className="muted" style={{ fontSize: ".82rem", margin: 0 }}>
        Dossier approuvé et dossier d&apos;ouverture transmis. Le compte devient actif (prises fermes possibles) dès que le SVT communique le numéro de sous-compte ouvert au nom du client.
      </p>
      <div className={styles.grid}>
        <label className="field">
          N° de sous-compte attribué
          <input name="custodianAccount" placeholder="ex. ECB-CT-2026-00087" required />
        </label>
      </div>
      {state && (state.ok ? <div className={styles.okMsg}>{state.message}</div> : <div className={styles.errMsg}>{state.error}</div>)}
      <div className={styles.actions}>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer et activer le compte"}
        </button>
      </div>
    </form>
  );
}

function ScreeningBlock({ file, closed }: { file: ClientFile; closed: boolean }) {
  const sc = file.screening;
  return (
    <div className={styles.screening}>
      <span className="eyebrow">Contrôle sanctions / PPE</span>
      {sc?.auto && (
        <div className={styles.autoHits}>
          Pré-contrôle {sc.auto.provider} du {new Date(sc.auto.checkedAt).toLocaleString("fr-FR")} — {sc.auto.queries.length} nom(s) — {sc.auto.hits.length} correspondance(s){sc.auto.error ? ` · erreur : ${sc.auto.error}` : ""}
          {sc.auto.hits.slice(0, 5).map((h, i) => (
            <div key={i}>
              {h.url ? (
                <a href={h.url} target="_blank" rel="noreferrer">
                  {h.name}
                </a>
              ) : (
                h.name
              )}{" "}
              · score {Math.round(h.score * 100)} % · {h.topics.join(", ") || "—"} · {h.datasets.slice(0, 3).join(", ")}
            </div>
          ))}
        </div>
      )}
      <div className={styles.grid}>
        <label className="field">
          Listes consultées
          <input name="screeningLists" defaultValue={sc?.lists ?? "ONU, UE, OFAC (OpenSanctions) ; PPE : recherche presse"} disabled={closed} />
        </label>
        <label className="field">
          Résultat
          <select name="screeningOutcome" defaultValue={sc?.outcome ?? ""} disabled={closed}>
            <option value="">— à renseigner —</option>
            <option value="aucun">Aucune correspondance</option>
            <option value="faux_positif">Correspondance écartée (faux positif documenté)</option>
            <option value="confirme">Correspondance confirmée — diligence renforcée</option>
          </select>
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          Notes du contrôle (homonymie écartée, sources, date de naissance comparée…)
          <input name="screeningNotes" defaultValue={sc?.notes} disabled={closed} />
        </label>
      </div>
      {sc?.attestedAt && (
        <small className="muted">
          Attesté par {sc.attestedBy} le {new Date(sc.attestedAt).toLocaleString("fr-FR")}.
        </small>
      )}
    </div>
  );
}

function AutoScreenButton({ file }: { file: ClientFile }) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(autoScreenAction, null);
  return (
    <form action={action} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="fileId" value={file.id} />
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "Contrôle…" : "Lancer le pré-contrôle automatique"}
      </button>
      {state && <small style={{ color: state.ok ? "var(--good)" : "var(--warn)", fontSize: ".76rem" }}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}

export function ReviewForm({ file, suggested, riskLabels }: { file: ClientFile; suggested: RiskRating; riskLabels: Record<RiskRating, string> }) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(reviewAction, null);
  const closed = file.status === "approuve" || file.status === "refuse";
  if (file.status === "approuve" && !file.review.custodianAccount) return <AccountForm file={file} />;
  return (
    <div className={styles.review}>
    {!closed && <AutoScreenButton file={file} />}
    <form action={action} className={styles.reviewInner}>
      <input type="hidden" name="fileId" value={file.id} />
      <h3>Décision de conformité</h3>
      <div className={styles.grid}>
        <label className="field">
          Notation de risque {file.review.risk ? "" : `(suggérée : ${riskLabels[suggested]})`}
          <select name="risk" defaultValue={file.review.risk ?? suggested} disabled={closed}>
            <option value="faible">Faible — revue tous les 5 ans</option>
            <option value="moyen">Moyen — revue tous les 3 ans</option>
            <option value="eleve">Élevé — revue annuelle, diligence renforcée</option>
          </select>
        </label>
        <label className="field">
          N° de sous-compte nominatif (si déjà attribué par le SVT)
          <input name="custodianAccount" defaultValue={file.review.custodianAccount} disabled={closed} placeholder="sinon, à renseigner après l'approbation" />
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          Notes internes
          <textarea name="notes" rows={2} defaultValue={file.review.notes} disabled={closed} />
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          Compléments à demander (si la décision est « compléments »)
          <input name="requestedItems" defaultValue={file.review.requestedItems} disabled={closed} placeholder="Ex. justificatif de domicile lisible, pièce du second mandataire" />
        </label>
      </div>
      <ScreeningBlock file={file} closed={closed} />
      {file.documents.length > 0 && (
        <div className={styles.verify}>
          <span className="eyebrow">Pièces vérifiées visuellement</span>
          {file.documents.map((d) => (
            <label key={d.kind}>
              <input type="checkbox" name="verified" value={d.kind} defaultChecked={d.verified} disabled={closed} /> {DOC_LABEL[d.kind]}
            </label>
          ))}
        </div>
      )}
      {state && (state.ok ? <div className={styles.okMsg}>{state.message}</div> : <div className={styles.errMsg}>{state.error}</div>)}
      {!closed && (
        <div className={styles.actions}>
          <button className="btn ghost sm" type="submit" name="decision" value="refuse" disabled={pending}>
            Refuser
          </button>
          <button className="btn" type="submit" name="decision" value="complements" disabled={pending}>
            Demander des compléments
          </button>
          <button className="btn" type="submit" name="decision" value="en_revue" disabled={pending}>
            Enregistrer la revue
          </button>
          <button className="btn primary" type="submit" name="decision" value="approuve" disabled={pending}>
            {pending ? "…" : "Approuver et ouvrir le compte"}
          </button>
        </div>
      )}
      {closed && (
        <div className="muted" style={{ fontSize: ".8rem" }}>
          Décision prise le {file.review.reviewedAt ? new Date(file.review.reviewedAt).toLocaleString("fr-FR") : "—"} par {file.review.reviewedBy ?? "—"}
          {file.review.nextReviewOn ? ` · prochaine revue le ${file.review.nextReviewOn}` : ""}.
        </div>
      )}
    </form>
    </div>
  );
}
