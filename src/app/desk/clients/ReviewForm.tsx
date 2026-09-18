"use client";

import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { useActionState } from "react";
import type { ClientFile, RiskRating } from "@/lib/domain/kyc";
import { DOC_LABEL } from "@/lib/kyc/checklist";
import { autoScreenAction, reviewAction, setCustodianAccountAction, type ReviewResult } from "./actions";
import styles from "./page.module.css";

function AccountForm({ file }: { file: ClientFile }) {
  const t = useT();
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(setCustodianAccountAction, null);
  return (
    <form action={action} className={styles.review}>
      <input type="hidden" name="fileId" value={file.id} />
      <h3>{t("Sous-compte nominatif chez le SVT")}</h3>
      <p className="muted" style={{ fontSize: ".82rem", margin: 0 }}>
        {t("Dossier approuvé et dossier d'ouverture transmis. Le compte devient actif (prises fermes possibles) dès que le SVT communique le numéro de sous-compte ouvert au nom du client.")}
      </p>
      <div className={styles.grid}>
        <label className="field">
          {t("N° de sous-compte attribué")}
          <input name="custodianAccount" placeholder={t("ex. ECB-CT-2026-00087")} required />
        </label>
      </div>
      {state && (state.ok ? <div className={styles.okMsg}>{state.message}</div> : <div className={styles.errMsg}>{state.error}</div>)}
      <div className={styles.actions}>
        <button className="btn primary" type="submit" disabled={pending}>
          {t(pending ? "…" : "Enregistrer et activer le compte")}
        </button>
      </div>
    </form>
  );
}

function ScreeningBlock({ file, closed }: { file: ClientFile; closed: boolean }) {
  const t = useT();
  const sc = file.screening;
  return (
    <div className={styles.screening}>
      <span className="eyebrow">{t("Contrôle sanctions / PPE")}</span>
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
          {t("Listes consultées")}
          <input name="screeningLists" defaultValue={sc?.lists ?? "ONU, UE, OFAC (OpenSanctions) ; PPE : recherche presse"} disabled={closed} />
        </label>
        <label className="field">
          {t("Résultat")}
          <Select block name="screeningOutcome" value={sc?.outcome ?? ""} disabled={closed} options={[{ value: "", label: t("— à renseigner —") }, { value: "aucun", label: t("Aucune correspondance") }, { value: "faux_positif", label: t("Correspondance écartée (faux positif documenté)") }, { value: "confirme", label: t("Correspondance confirmée — diligence renforcée") }]} />
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          {t("Notes du contrôle (homonymie écartée, sources, date de naissance comparée…)")}
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
  const t = useT();
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(autoScreenAction, null);
  return (
    <form action={action} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="fileId" value={file.id} />
      <button className="btn sm" type="submit" disabled={pending}>
        {t(pending ? "Contrôle…" : "Lancer le pré-contrôle automatique")}
      </button>
      {state && <small style={{ color: state.ok ? "var(--good)" : "var(--warn)", fontSize: ".76rem" }}>{state.ok ? state.message : state.error}</small>}
    </form>
  );
}

export function ReviewForm({ file, suggested, riskLabels }: { file: ClientFile; suggested: RiskRating; riskLabels: Record<RiskRating, string> }) {
  const t = useT();
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(reviewAction, null);
  const closed = file.status === "approuve" || file.status === "refuse";
  if (file.status === "approuve" && !file.review.custodianAccount) return <AccountForm file={file} />;
  return (
    <div className={styles.review}>
    {!closed && <AutoScreenButton file={file} />}
    <form action={action} className={styles.reviewInner}>
      <input type="hidden" name="fileId" value={file.id} />
      <h3>{t("Décision de conformité")}</h3>
      <div className={styles.grid}>
        <label className="field">
          {t("Notation de risque")} {file.review.risk ? "" : `(${t("suggérée")} : ${t(riskLabels[suggested])})`}
          <Select block name="risk" value={file.review.risk ?? suggested} disabled={closed} options={[{ value: "faible", label: t("Faible — revue tous les 5 ans") }, { value: "moyen", label: t("Moyen — revue tous les 3 ans") }, { value: "eleve", label: t("Élevé — revue annuelle, diligence renforcée") }]} />
        </label>
        <label className="field">
          {t("N° de sous-compte nominatif (si déjà attribué par le SVT)")}
          <input name="custodianAccount" defaultValue={file.review.custodianAccount} disabled={closed} placeholder={t("sinon, à renseigner après l'approbation")} />
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          {t("Notes internes")}
          <textarea name="notes" rows={2} defaultValue={file.review.notes} disabled={closed} />
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          {t("Compléments à demander (si la décision est « compléments »)")}
          <input name="requestedItems" defaultValue={file.review.requestedItems} disabled={closed} placeholder={t("Ex. justificatif de domicile lisible, pièce du second mandataire")} />
        </label>
      </div>
      <ScreeningBlock file={file} closed={closed} />
      {file.documents.length > 0 && (
        <div className={styles.verify}>
          <span className="eyebrow">{t("Pièces vérifiées visuellement")}</span>
          {file.documents.map((d) => (
            <label key={d.kind}>
              <input type="checkbox" name="verified" value={d.kind} defaultChecked={d.verified} disabled={closed} /> {t(DOC_LABEL[d.kind])}
            </label>
          ))}
        </div>
      )}
      {state && (state.ok ? <div className={styles.okMsg}>{state.message}</div> : <div className={styles.errMsg}>{state.error}</div>)}
      {!closed && (
        <div className={styles.actions}>
          <button className="btn ghost sm" type="submit" name="decision" value="refuse" disabled={pending}>
            {t("Refuser")}
          </button>
          <button className="btn" type="submit" name="decision" value="complements" disabled={pending}>
            {t("Demander des compléments")}
          </button>
          <button className="btn" type="submit" name="decision" value="en_revue" disabled={pending}>
            {t("Enregistrer la revue")}
          </button>
          <button className="btn primary" type="submit" name="decision" value="approuve" disabled={pending}>
            {t(pending ? "…" : "Approuver et ouvrir le compte")}
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
