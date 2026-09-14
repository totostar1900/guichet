"use client";

import { useActionState } from "react";
import type { ClientFile, RiskRating } from "@/lib/domain/kyc";
import { DOC_LABEL } from "@/lib/kyc/checklist";
import { reviewAction, type ReviewResult } from "./actions";
import styles from "./page.module.css";

export function ReviewForm({ file, suggested, riskLabels }: { file: ClientFile; suggested: RiskRating; riskLabels: Record<RiskRating, string> }) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(reviewAction, null);
  const closed = file.status === "approuve" || file.status === "refuse";
  return (
    <form action={action} className={styles.review}>
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
          N° de compte chez le dépositaire (si attribué)
          <input name="custodianAccount" defaultValue={file.review.custodianAccount} disabled={closed} placeholder="attribué par le SVT après le dossier d'ouverture" />
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
  );
}
