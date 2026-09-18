import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import type { ClientFile } from "@/lib/domain/kyc";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { autoChecks, DOC_LABEL, KIND_LABEL, requiredDocs, RISK_LABEL, STATUS_LABEL, suggestedRisk } from "@/lib/kyc/checklist";
import { ReviewForm } from "./ReviewForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

const ROLE = { representant: "Représentant", mandataire: "Mandataire", beneficiaire_effectif: "Bénéficiaire effectif" };
const ORDER: Record<ClientFile["status"], number> = { soumis: 0, en_revue: 1, complements: 2, brouillon: 3, approuve: 4, refuse: 5 };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ file?: string }> }) {
  const sp = await searchParams;
  const r = repo();
  const files = (await r.listClientFiles()).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt));
  const docs = await r.listDocuments();
  const todo = files.filter((f) => f.status === "soumis" || f.status === "en_revue").length;
  const selected = files.find((f) => f.id === sp.file) ?? files.find((f) => f.status === "soumis" || f.status === "en_revue") ?? files[0];
  const kycDocs = selected ? docs.filter((d) => d.clientFileId === selected.id) : [];
  const now = new Date();

  return (
    <>
      <DeskNav current="/desk/clients" badges={{ "/desk/clients": todo }} />

      <div className={styles.layout}>
        <aside className={styles.queue} data-coach="queue">
          {files.map((f) => (
            <Link key={f.id} href={`/desk/clients?file=${f.id}`} className={styles.qitem} aria-current={f.id === selected?.id ? "true" : undefined}>
              <div className={styles.meta}>
                <span className={`${styles.st} ${styles[`st_${f.status}`]}`}>{STATUS_LABEL[f.status]}</span>
                <span>{KIND_LABEL[f.kind]}</span>
              </div>
              <b>{f.identity.name || "(sans nom)"}</b>
              <span className={styles.meta}>
                {f.identity.city ?? ""} · mis à jour {fmtDateTime(f.updatedAt)}
              </span>
            </Link>
          ))}
          {files.length === 0 && <div className="empty">Aucun dossier client. Un client démarre le sien depuis « Ouvrir un compte ».</div>}
        </aside>

        {selected && (
          <div className={styles.detail}>
            <div className={styles.dHead}>
              <div>
                <div className="eyebrow">{KIND_LABEL[selected.kind]}</div>
                <h2 className="display">{selected.identity.name || "(sans nom)"}</h2>
                <div className="muted" style={{ fontSize: ".8rem" }}>
                  {[selected.identity.phone, selected.identity.email, selected.identity.city, selected.identity.country].filter(Boolean).join(" · ")}
                  {selected.submittedAt ? ` · soumis le ${fmtDateTime(selected.submittedAt)}` : ""}
                </div>
              </div>
              <span className={`${styles.st} ${styles[`st_${selected.status}`]}`}>{STATUS_LABEL[selected.status]}</span>
            </div>

            <div className={styles.cols}>
              <div>
                <h3>Identité</h3>
                <dl className={styles.dl}>
                  {selected.kind === "physique" ? (
                    <>
                      <dt>Naissance</dt>
                      <dd>{selected.identity.birthDate ? fmtDate(selected.identity.birthDate) : "—"} · {selected.identity.nationality ?? "—"}</dd>
                      <dt>Pièce</dt>
                      <dd>
                        {selected.identity.idType ?? "—"} n° {selected.identity.idNumber ?? "—"}
                        {selected.identity.idExpiresOn ? `, expire le ${fmtDate(selected.identity.idExpiresOn)}` : ""}
                      </dd>
                      <dt>Profession</dt>
                      <dd>{selected.identity.profession ?? "—"}</dd>
                    </>
                  ) : (
                    <>
                      <dt>Immatriculation</dt>
                      <dd>{selected.identity.registration ?? "—"}</dd>
                      <dt>Forme</dt>
                      <dd>{selected.identity.legalForm ?? "—"}</dd>
                      {selected.identity.decisionRule && (
                        <>
                          <dt>Règle de décision</dt>
                          <dd>{selected.identity.decisionRule}</dd>
                        </>
                      )}
                    </>
                  )}
                  <dt>NIU</dt>
                  <dd>{selected.identity.taxId ?? "—"}</dd>
                  <dt>Adresse</dt>
                  <dd>{[selected.identity.address, selected.identity.city, selected.identity.country].filter(Boolean).join(", ") || "—"}</dd>
                  <dt>Résident hors CEMAC</dt>
                  <dd>{selected.identity.residentAbroad ? "oui" : "non"}</dd>
                  <dt>Origine des fonds</dt>
                  <dd>
                    {selected.funds.source ?? "—"}
                    {selected.funds.expectedAmount ? ` · ${selected.funds.expectedAmount}` : ""}
                    {selected.funds.bankName ? ` · banque ${selected.funds.bankName}` : ""}
                  </dd>
                  <dt>Compte de règlement</dt>
                  <dd className="mono">{selected.funds.bankAccount ? `${selected.funds.bankAccount}${selected.funds.bankHolder ? ` · ${selected.funds.bankHolder}` : ""}` : "RIB manquant"}</dd>
                  <dt>PPE</dt>
                  <dd>{selected.funds.pep ? `oui — ${selected.funds.pepDetails ?? ""}` : "non"}</dd>
                  <dt>Profil</dt>
                  <dd>{[selected.profile.objectives, selected.profile.horizon, selected.profile.riskTolerance].filter(Boolean).join(" · ") || "—"}</dd>
                  <dt>Convention</dt>
                  <dd>{selected.consents.conventionAt ? `acceptée le ${fmtDateTime(selected.consents.conventionAt)} (${selected.consents.conventionMethod})` : "non acceptée"}</dd>
                </dl>
                {selected.persons.length > 0 && (
                  <>
                    <h3>Personnes</h3>
                    <table className="tbl">
                      <tbody>
                        {selected.persons.map((p, i) => (
                          <tr key={i}>
                            <td>{ROLE[p.role]}</td>
                            <td>
                              <b>{p.name}</b>
                              {p.idNumber ? <small className="muted"> · {p.idNumber}</small> : null}
                            </td>
                            <td className="r">{p.share ? `${p.share} %` : ""}</td>
                            <td>{p.pep ? <span className="st recue">PPE</span> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
              <div>
                <h3>Contrôles</h3>
                <ul className={styles.checks}>
                  {autoChecks(selected, now).map((c) => (
                    <li key={c.label} className={c.ok === true ? styles.ok : c.ok === false ? styles.ko : styles.manual}>
                      <b>{c.label}</b> <span>{c.detail}</span>
                    </li>
                  ))}
                </ul>
                <h3>Pièces</h3>
                <ul className={styles.pieces}>
                  {requiredDocs(selected.kind, selected.identity.residentAbroad).map((k) => {
                    const d = selected.documents.find((x) => x.kind === k);
                    return (
                      <li key={k} className={d ? "" : styles.missing}>
                        {d ? (
                          <a href={`/desk/clients/piece/${selected.id}/${k}`} target="_blank" rel="noreferrer">
                            {DOC_LABEL[k]}
                          </a>
                        ) : (
                          <span>{DOC_LABEL[k]} — manquante</span>
                        )}
                        {d?.verified && <small className={styles.okText}> vérifiée</small>}
                      </li>
                    );
                  })}
                </ul>
                {kycDocs.length > 0 && (
                  <>
                    <h3>Documents émis</h3>
                    <ul className={styles.pieces}>
                      {kycDocs.map((d) => (
                        <li key={d.id}>
                          <a href={`/desk/documents/pdf/${d.id}`} target="_blank" rel="noreferrer" className="mono">
                            {d.number}
                          </a>{" "}
                          · {d.title}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div data-coach="review">
              <ReviewForm file={selected} suggested={suggestedRisk(selected)} riskLabels={RISK_LABEL} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
