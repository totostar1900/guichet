"use client";

import { useActionState } from "react";
import type { ClientFile, KycDocKind } from "@/lib/domain/kyc";
import { DOC_LABEL, requiredDocs } from "@/lib/kyc/checklist";
import { fmtDateTime } from "@/lib/format";
import { addPersonAction, removePersonAction, saveFundsProfileAction, saveIdentityAction, sendConventionCodeAction, submitFileAction, uploadDocAction, verifyConventionCodeAction, type StepResult } from "./actions";
import styles from "./page.module.css";

type P = { file: ClientFile; editable: boolean };

function Msg({ state }: { state: StepResult | null }) {
  if (!state) return null;
  return state.ok ? (state.message ? <div className={styles.ok}>{state.message}</div> : null) : <div className={styles.err}>{state.error}</div>;
}

const Save = ({ pending, editable, label = "Enregistrer" }: { pending: boolean; editable: boolean; label?: string }) => (
  <button className="btn primary" type="submit" disabled={pending || !editable}>
    {pending ? "…" : label}
  </button>
);

/* ---------------- 2 · Identité ---------------- */
export function IdentitySection({ file, editable }: P) {
  const [state, action, pending] = useActionState<StepResult | null, FormData>(saveIdentityAction, null);
  const id = file.identity;
  const phys = file.kind === "physique";
  return (
    <section className={styles.sec}>
      <h2 className="display">2 · Identité{phys ? "" : " de l'entité"}</h2>
      <form action={action} className={styles.form}>
        <fieldset disabled={!editable} className={styles.grid}>
          <label className="field">
            {phys ? "Nom et prénom(s), comme sur la pièce" : "Raison sociale / dénomination"}
            <input name="name" defaultValue={id.name} required />
          </label>
          <label className="field">
            Téléphone WhatsApp (international)
            <input name="phone" defaultValue={id.phone} placeholder="+237 6 87 67 67 67" inputMode="tel" />
          </label>
          <label className="field">
            E-mail
            <input name="email" type="email" defaultValue={id.email} />
          </label>
          <label className="field">
            Adresse
            <input name="address" defaultValue={id.address} />
          </label>
          <label className="field">
            Ville
            <input name="city" defaultValue={id.city} />
          </label>
          <label className="field">
            Pays de résidence
            <input name="country" defaultValue={id.country ?? "Cameroun"} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="residentAbroad" defaultChecked={id.residentAbroad} /> Je réside hors CEMAC (diaspora)
          </label>
          {phys ? (
            <>
              <label className="field">
                Date de naissance
                <input name="birthDate" type="date" defaultValue={id.birthDate} />
              </label>
              <label className="field">
                Nationalité
                <input name="nationality" defaultValue={id.nationality} />
              </label>
              <label className="field">
                Profession / activité
                <input name="profession" defaultValue={id.profession} />
              </label>
              <label className="field">
                NIU (identifiant fiscal)
                <input name="taxId" defaultValue={id.taxId} />
              </label>
              <label className="field">
                Pièce d&apos;identité
                <select name="idType" defaultValue={id.idType ?? "CNI"}>
                  <option>CNI</option>
                  <option>Passeport</option>
                  <option>Carte de séjour</option>
                </select>
              </label>
              <label className="field">
                Numéro de la pièce
                <input name="idNumber" defaultValue={id.idNumber} />
              </label>
              <label className="field">
                Expire le
                <input name="idExpiresOn" type="date" defaultValue={id.idExpiresOn} />
              </label>
            </>
          ) : (
            <>
              <label className="field">
                {file.kind === "groupement" ? "Récépissé / référence de déclaration" : "RCCM / immatriculation"}
                <input name="registration" defaultValue={id.registration} />
              </label>
              <label className="field">
                {file.kind === "groupement" ? "Forme du groupement" : "Forme juridique"}
                {file.kind === "groupement" ? (
                  <select name="legalForm" defaultValue={id.legalForm ?? ""}>
                    <option value="">—</option>
                    <option value="association déclarée">Association déclarée (compte au nom de l&apos;association)</option>
                    <option value="indivision de mandataires">Groupe informel — compte en indivision au nom des mandataires</option>
                    <option value="coopérative / GIC">Coopérative ou GIC</option>
                  </select>
                ) : (
                  <input name="legalForm" defaultValue={id.legalForm} placeholder="SARL, SA, SAS…" />
                )}
              </label>
              <label className="field">
                NIU (identifiant fiscal)
                <input name="taxId" defaultValue={id.taxId} />
              </label>
              {file.kind === "groupement" && (
                <label className="field">
                  Règle de décision pour passer un ordre
                  <input name="decisionRule" defaultValue={id.decisionRule} placeholder="Ex. double signature, plafond 5 M FCFA par ordre" />
                </label>
              )}
            </>
          )}
        </fieldset>
        <Msg state={state} />
        <div className={styles.actions}>
          <Save pending={pending} editable={editable} />
        </div>
      </form>
    </section>
  );
}

/* ---------------- 2b · Personnes ---------------- */
export function PersonsSection({ file, editable }: P) {
  const [state, action, pending] = useActionState<StepResult | null, FormData>(addPersonAction, null);
  const roleLabel = { representant: "Représentant légal", mandataire: "Mandataire", beneficiaire_effectif: "Bénéficiaire effectif" };
  return (
    <section className={styles.sec}>
      <h2 className="display">2b · Représentants, mandataires, bénéficiaires effectifs</h2>
      <p className={styles.hint}>{file.kind === "groupement" ? "Les 2 ou 3 mandataires désignés par l'assemblée, et les membres détenant plus de 25 % de l'épargne." : "Qui peut passer ordre (avec la pièce à joindre), et qui détient plus de 25 % du capital ou en a le contrôle."}</p>
      {file.persons.length > 0 && (
        <table className="tbl">
          <tbody>
            {file.persons.map((p, i) => (
              <tr key={i}>
                <td>{roleLabel[p.role]}</td>
                <td>
                  <b>{p.name}</b>
                  {p.idNumber && <small className="muted"> · pièce {p.idNumber}</small>}
                </td>
                <td className="r">{p.share ? `${p.share} %` : ""}</td>
                <td>{p.pep ? <span className="st recue">PPE</span> : null}</td>
                <td className="r">
                  {editable && (
                    <form action={removePersonAction}>
                      <input type="hidden" name="index" value={i} />
                      <button className="btn sm ghost" type="submit">
                        Retirer
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form action={action} className={styles.form}>
        <fieldset disabled={!editable} className={styles.grid}>
          <label className="field">
            Rôle
            <select name="role" defaultValue={file.kind === "groupement" ? "mandataire" : "representant"}>
              <option value="representant">Représentant légal / signataire</option>
              <option value="mandataire">Mandataire</option>
              <option value="beneficiaire_effectif">Bénéficiaire effectif (&gt; 25 %)</option>
            </select>
          </label>
          <label className="field">
            Nom et prénom(s)
            <input name="name" required minLength={2} />
          </label>
          <label className="field">
            N° de pièce d&apos;identité
            <input name="idNumber" />
          </label>
          <label className="field">
            Part (%) si bénéficiaire effectif
            <input name="share" type="number" min={0} max={100} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="pep" /> Personne politiquement exposée (ou proche)
          </label>
        </fieldset>
        <Msg state={state} />
        <div className={styles.actions}>
          <Save pending={pending} editable={editable} label="Ajouter" />
        </div>
      </form>
    </section>
  );
}

/* ---------------- 3 · Pièces ---------------- */
function DocRow({ kind, file, editable }: { kind: KycDocKind; file: ClientFile; editable: boolean }) {
  const [state, action, pending] = useActionState<StepResult | null, FormData>(uploadDocAction, null);
  const have = file.documents.find((d) => d.kind === kind);
  const photoish = kind === "selfie" || kind.startsWith("piece_identite");
  return (
    <form action={action} className={`${styles.docRow} ${have ? styles.docHave : ""}`}>
      <input type="hidden" name="kind" value={kind} />
      <div className={styles.docLabel}>
        <b>{DOC_LABEL[kind]}</b>
        {have ? (
          <small className={styles.okText}>
            Reçue · {have.fileName} · {fmtDateTime(have.uploadedAt)}
          </small>
        ) : (
          <small className="muted">{kind === "selfie" ? "Prenez-vous en photo, visage dégagé, bon éclairage." : "Photo nette ou PDF."}</small>
        )}
        <Msg state={state} />
      </div>
      <fieldset disabled={!editable} className={styles.docInput}>
        <input type="file" name="file" accept={photoish ? "image/*" : "image/*,application/pdf"} capture={kind === "selfie" ? "user" : undefined} required />
        <button className="btn sm" type="submit" disabled={pending}>
          {pending ? "Envoi…" : have ? "Remplacer" : "Envoyer"}
        </button>
      </fieldset>
    </form>
  );
}

export function DocsSection({ file, editable }: P) {
  const req = requiredDocs(file.kind, file.identity.residentAbroad);
  const extra = file.documents.filter((d) => !req.includes(d.kind));
  return (
    <section className={styles.sec}>
      <h2 className="display">3 · Pièces justificatives</h2>
      <p className={styles.hint}>Photographiez chaque pièce avec votre téléphone. Les originaux sont conservés de façon chiffrée et ne servent qu&apos;à la vérification de votre identité.</p>
      <div className={styles.docs}>
        {req.map((k) => (
          <DocRow key={k} kind={k} file={file} editable={editable} />
        ))}
        {extra.map((d) => (
          <DocRow key={d.kind} kind={d.kind} file={file} editable={editable} />
        ))}
      </div>
    </section>
  );
}

/* ---------------- 4 · Fonds & profil ---------------- */
export function FundsSection({ file, editable }: P) {
  const [state, action, pending] = useActionState<StepResult | null, FormData>(saveFundsProfileAction, null);
  const f = file.funds;
  const p = file.profile;
  return (
    <section className={styles.sec}>
      <h2 className="display">4 · Origine des fonds et profil investisseur</h2>
      <form action={action} className={styles.form}>
        <fieldset disabled={!editable} className={styles.grid}>
          <label className="field">
            Origine des fonds investis
            <select name="source" defaultValue={f.source ?? ""}>
              <option value="">—</option>
              <option>Revenus professionnels / salaires</option>
              <option>Épargne accumulée</option>
              <option>Revenus d&apos;activité de l&apos;entreprise</option>
              <option>Cotisations des membres</option>
              <option>Cession d&apos;actifs / héritage</option>
              <option>Autre (préciser dans le message au desk)</option>
            </select>
          </label>
          <label className="field">
            Montant envisagé sur 12 mois (FCFA)
            <select name="expectedAmount" defaultValue={f.expectedAmount ?? ""}>
              <option value="">—</option>
              <option>Moins de 5 millions</option>
              <option>5 à 25 millions</option>
              <option>25 à 100 millions</option>
              <option>Plus de 100 millions</option>
            </select>
          </label>
          <label className="field">
            Banque du compte de règlement (au nom du client)
            <input name="bankName" defaultValue={f.bankName} placeholder="Ex. Afriland First Bank" />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="pep" defaultChecked={f.pep} /> Je suis (ou un proche est) une personne politiquement exposée
          </label>
          <label className="field">
            Si oui, précisez
            <input name="pepDetails" defaultValue={f.pepDetails} />
          </label>
          <label className="field">
            Objectif principal
            <select name="objectives" defaultValue={p.objectives ?? ""}>
              <option value="">—</option>
              <option>Revenus réguliers (coupons)</option>
              <option>Préserver le capital</option>
              <option>Faire croître le capital</option>
              <option>Placer une trésorerie</option>
            </select>
          </label>
          <label className="field">
            Horizon
            <select name="horizon" defaultValue={p.horizon ?? ""}>
              <option value="">—</option>
              <option>Moins d&apos;un an</option>
              <option>1 à 3 ans</option>
              <option>3 à 5 ans</option>
              <option>Plus de 5 ans</option>
            </select>
          </label>
          <label className="field">
            Expérience des titres
            <select name="experience" defaultValue={p.experience ?? ""}>
              <option value="">—</option>
              <option>Aucune</option>
              <option>Bons ou obligations du Trésor déjà détenus</option>
              <option>Actions cotées déjà détenues</option>
              <option>Professionnel de la finance</option>
            </select>
          </label>
          <label className="field">
            Tolérance au risque
            <select name="riskTolerance" defaultValue={p.riskTolerance ?? ""}>
              <option value="">—</option>
              <option>Aucune perte acceptable</option>
              <option>Petites fluctuations acceptables</option>
              <option>Pertes temporaires acceptables pour un meilleur rendement</option>
            </select>
          </label>
          <label className="field">
            Capacité à supporter une perte
            <select name="lossCapacity" defaultValue={p.lossCapacity ?? ""}>
              <option value="">—</option>
              <option>Faible — ces fonds sont nécessaires à court terme</option>
              <option>Moyenne</option>
              <option>Élevée — épargne de long terme</option>
            </select>
          </label>
        </fieldset>
        <Msg state={state} />
        <div className={styles.actions}>
          <Save pending={pending} editable={editable} />
        </div>
      </form>
    </section>
  );
}

/* ---------------- 5 · Consentements & convention ---------------- */
export function ConsentSection({ file, editable }: P) {
  const [sendState, sendAct, sending] = useActionState<StepResult | null, FormData>(sendConventionCodeAction, null);
  const [verState, verAct, verifying] = useActionState<StepResult | null, FormData>(verifyConventionCodeAction, null);
  const c = file.consents;
  const accepted = Boolean(c.conventionAt);
  return (
    <section className={styles.sec}>
      <h2 className="display">5 · Convention et consentements</h2>
      <div className={styles.convention}>
        <b>Convention d&apos;ouverture de compte-titres — l&apos;essentiel</b>
        <ul>
          <li>Vos titres sont dématérialisés, inscrits à votre nom, conservés chez le dépositaire désigné ; Purpose Capital intervient comme intermédiaire.</li>
          <li>Les espèces transitent par un compte de règlement ségrégué ; les fonds doivent provenir d&apos;un compte à votre nom.</li>
          <li>Une intention n&apos;est pas un ordre : un ordre naît d&apos;une confirmation et d&apos;un bulletin accepté.</li>
          <li>Tarifs : commission d&apos;intermédiation par opération (annexe), droits de garde annuels, aucun frais d&apos;ouverture.</li>
          <li>Vous recevez un avis d&apos;opéré par opération et un relevé de position ; réclamations et médiation COSUMAF décrites en annexe.</li>
          <li>Données : conservées 10 ans après la fin de la relation (obligation LBC/FT), utilisées pour la relation et le reporting réglementaire.</li>
        </ul>
        <a className="btn sm" href="/desk/documents/convention-modele" target="_blank" rel="noreferrer">
          Lire la convention complète (PDF)
        </a>
      </div>
      {accepted ? (
        <div className={styles.ok}>
          Convention acceptée le {fmtDateTime(c.conventionAt!)} par {c.conventionMethod}. {c.whatsappAt ? "Notifications WhatsApp activées." : "Notifications par e-mail."}
        </div>
      ) : (
        <>
          <form action={sendAct} className={styles.form}>
            <fieldset disabled={!editable} className={styles.consents}>
              <label className={styles.check}>
                <input type="checkbox" name="data" defaultChecked={Boolean(c.dataAt)} required /> J&apos;accepte le traitement de mes données pour l&apos;ouverture et la tenue de mon compte (obligatoire).
              </label>
              <label className={styles.check}>
                <input type="checkbox" name="whatsapp" defaultChecked={Boolean(c.whatsappAt)} /> J&apos;accepte de recevoir les offres et avis sur WhatsApp (STOP à tout moment).
              </label>
            </fieldset>
            <Msg state={sendState} />
            {sendState?.ok && sendState.code && (
              <div className={styles.demoCode}>
                Code de démonstration : <b className="mono">{sendState.code}</b>
              </div>
            )}
            <div className={styles.actions}>
              <Save pending={sending} editable={editable} label="Recevoir mon code d'acceptation" />
            </div>
          </form>
          <form action={verAct} className={styles.form}>
            <fieldset disabled={!editable} className={styles.codeRow}>
              <label className="field">
                Code reçu
                <input name="code" inputMode="numeric" maxLength={6} placeholder="6 chiffres" />
              </label>
              <button className="btn primary" type="submit" disabled={verifying}>
                {verifying ? "…" : "J'accepte la convention"}
              </button>
            </fieldset>
            <Msg state={verState} />
          </form>
        </>
      )}
    </section>
  );
}

/* ---------------- 6 · Soumettre ---------------- */
export function SubmitSection({ file, editable, missing }: P & { missing: string[] }) {
  const [state, action, pending] = useActionState<StepResult | null, FormData>(submitFileAction, null);
  if (!editable) return null;
  return (
    <section className={styles.sec}>
      <h2 className="display">6 · Envoyer mon dossier</h2>
      {missing.length > 0 ? (
        <p className={styles.hint}>
          Encore à compléter : <b>{missing.join(", ")}</b>.
        </p>
      ) : (
        <p className={styles.hint}>Tout y est. Un conseiller vérifie votre dossier et vous prévient dès l&apos;ouverture du compte.</p>
      )}
      <form action={action}>
        <Msg state={state} />
        <button className="btn primary" type="submit" disabled={pending || missing.length > 0}>
          {pending ? "Envoi…" : file.status === "complements" ? "Renvoyer mon dossier complété" : "Envoyer mon dossier"}
        </button>
      </form>
    </section>
  );
}
