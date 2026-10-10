"use client";

import Link from "next/link";

import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { startTransition, useActionState } from "react";
import { shrinkPhoto } from "@/lib/image-client";
import type { ClientFile, KycDocKind, KycDocument } from "@/lib/domain/kyc";
import { DOC_LABEL, requiredDocs } from "@/lib/kyc/checklist";
import { fmtDateTime } from "@/lib/format";
import { addPersonAction, removeDocAction, removePersonAction, saveConsentsAction, saveFundsProfileAction, saveIdentityAction, submitFileAction, uploadDocAction, type StepResult } from "./actions";
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
  const t = useT();
  const [state, action, pending] = useActionState<StepResult | null, FormData>(saveIdentityAction, null);
  const id = file.identity;
  const phys = file.kind === "physique";
  return (
    <section className={styles.sec}>
      <h2 className="display">{t(phys ? "2 · Identité" : "2 · Identité de l'entité")}</h2>
      <form action={action} className={styles.form}>
        <fieldset disabled={!editable} className={styles.grid}>
          <label className="field">
            {t(phys ? "Nom et prénom(s), comme sur la pièce" : "Raison sociale / dénomination")}
            <input name="name" defaultValue={id.name} required />
          </label>
          <label className="field">
            {t("Téléphone WhatsApp (international)")}
            <input name="phone" defaultValue={id.phone} placeholder="+237 6 87 67 67 67" inputMode="tel" />
          </label>
          <label className="field">
            {t("E-mail")}
            <input name="email" type="email" defaultValue={id.email} />
          </label>
          <label className="field">
            {t("Adresse")}
            <input name="address" defaultValue={id.address} />
          </label>
          <label className="field">
            {t("Ville")}
            <input name="city" defaultValue={id.city} />
          </label>
          <label className="field">
            {t("Pays de résidence")}
            <input name="country" defaultValue={id.country ?? "Cameroun"} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="residentAbroad" defaultChecked={id.residentAbroad} /> {t("Je réside hors CEMAC (diaspora)")}
          </label>
          {phys ? (
            <>
              <label className="field">
                {t("Date de naissance")}
                <input name="birthDate" type="date" defaultValue={id.birthDate} />
              </label>
              <label className="field">
                {t("Nationalité")}
                <input name="nationality" defaultValue={id.nationality} />
              </label>
              <label className="field">
                {t("Profession / activité")}
                <input name="profession" defaultValue={id.profession} />
              </label>
              <label className="field">
                {t("NIU (identifiant fiscal)")}
                <input name="taxId" defaultValue={id.taxId} />
              </label>
              <label className="field">
                {t("Pièce d'identité")}
                <Select block name="idType" value={id.idType ?? "CNI"} options={[{ value: "CNI", label: "CNI" }, { value: "Passeport", label: t("Passeport") }, { value: "Carte de séjour", label: t("Carte de séjour") }]} />
              </label>
              <label className="field">
                {t("Numéro de la pièce")}
                <input name="idNumber" defaultValue={id.idNumber} />
              </label>
              <label className="field">
                {t("Expire le")}
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
                  <Select block name="legalForm" value={id.legalForm ?? ""} options={[{ value: "", label: "—" }, { value: "association déclarée", label: t("Association déclarée (compte au nom de l'association)") }, { value: "indivision de mandataires", label: t("Groupe informel : compte en indivision au nom des mandataires (jusqu'à 25 M FCFA)") }, { value: "coopérative / GIC", label: t("Coopérative ou GIC") }]} />
                ) : (
                  <input name="legalForm" defaultValue={id.legalForm} placeholder={t("SARL, SA, SAS…")} />
                )}
              </label>
              <label className="field">
                {t("NIU (identifiant fiscal)")}
                <input name="taxId" defaultValue={id.taxId} />
              </label>
              {file.kind === "groupement" && (
                <p className={styles.hint} style={{ gridColumn: "1 / -1", margin: 0 }}>
                  {t("Un groupe informel peut investir jusqu'à")} <b>{t("25 M FCFA")}</b> {t("de nominal sur un compte en indivision au nom de ses mandataires (2 ou 3 membres, PV et règle de décision). Au-delà, le groupe doit être une")} <b>{t("association déclarée")}</b> {t(": le compte est alors ouvert à son nom et lui appartient quels que soient ses membres.")}
                </p>
              )}
              {file.kind === "groupement" && (
                <label className="field">
                  {t("Règle de décision pour passer un ordre")}
                  <input name="decisionRule" defaultValue={id.decisionRule} placeholder={t("Ex. double signature, plafond 5 M FCFA par ordre")} />
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
  const t = useT();
  const [state, action, pending] = useActionState<StepResult | null, FormData>(addPersonAction, null);
  const roleLabel = { representant: "Représentant légal", cotitulaire: "Cotitulaire désigné", beneficiaire_effectif: "Bénéficiaire effectif" };
  return (
    <section className={styles.sec}>
      <h2 className="display">{t("2b · Représentants, cotitulaires, bénéficiaires effectifs")}</h2>
      {/* LA MAISON N'ACCEPTE AUCUNE PROCURATION depuis le 10 octobre 2026 : le
          titulaire est seul à donner ses ordres. Ce qui reste ici n'est pas un
          tiers à qui il délègue, c'est le titulaire lui-même quand il n'est pas
          une personne physique : l'organe qui signe pour une société, les deux
          ou trois désignés d'une indivision. */}
      <p className={styles.hint}>{file.kind === "groupement" ? "Les 2 ou 3 cotitulaires désignés par l'assemblée, et les membres détenant plus de 25 % de l'épargne." : "Le représentant légal, qui signe et donne les ordres au nom de la personne morale, et qui détient plus de 25 % du capital ou en a le contrôle. La maison n'accepte aucune procuration : personne ne passe d'ordre à la place du titulaire."}</p>
      {file.persons.length > 0 && (
        <table className="tbl">
          <tbody>
            {file.persons.map((p, i) => (
              <tr key={i}>
                <td>{roleLabel[p.role]}</td>
                <td>
                  <b>{p.name}</b>
                  {p.birthDate && <small className="muted"> · {p.birthDate}</small>}
                  {/* La clef était interpolée, donc introuvable au dictionnaire : t(`· pièce 123456789`) ne peut correspondre à rien. Une clef à trou se traduit. */}
                  {p.idNumber && <small className="muted"> · {t("pièce {n}", { n: p.idNumber })}</small>}
                </td>
                <td className="r">{p.share ? `${p.share} %` : ""}</td>
                <td>{p.pep ? <span className="st recue">PPE</span> : null}</td>
                <td className="r">
                  {editable && (
                    <form action={removePersonAction}>
                      <input type="hidden" name="index" value={i} />
                      <button className="btn sm ghost" type="submit">
                        {t("Retirer")}
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
            {t("Rôle")}
            <Select block name="role" value={file.kind === "groupement" ? "cotitulaire" : "representant"} options={file.kind === "groupement" ? [{ value: "cotitulaire", label: t("Cotitulaire désigné") }, { value: "beneficiaire_effectif", label: t("Bénéficiaire effectif (> 25 %)") }] : [{ value: "representant", label: t("Représentant légal / signataire") }, { value: "beneficiaire_effectif", label: t("Bénéficiaire effectif (> 25 %)") }]} />
          </label>
          <label className="field">
            Nom et prénom(s)
            <input name="name" required minLength={2} />
          </label>
          {/* ELLE EST OBLIGATOIRE, et ce n'est pas une formalité de plus. Le
              contrôle sanctions ne reçoit qu'un nom, et un nom seul rend
              vingt homonymes qu'il faut écarter un par un ; le registre des
              personnes écartées, lui, n'accroche par le nom que si la date
              l'accompagne. Sans elle, ces deux contrôles tournent à vide sur
              la personne même qui agit pour le titulaire. */}
          <label className="field">
            {t("Date de naissance")}
            <input type="date" name="birthDate" required />
          </label>
          <label className="field">
            {t("N° de pièce d'identité")}
            <input name="idNumber" />
          </label>
          <label className="field">
            {t("Part (%) si bénéficiaire effectif")}
            <input name="share" type="number" min={0} max={100} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="pep" /> {t("Personne politiquement exposée (ou proche)")}
          </label>
        </fieldset>
        <Msg state={state} />
        <div className={styles.actions}>
          <Save pending={pending} editable={editable} label={t("Ajouter")} />
        </div>
      </form>
    </section>
  );
}

/* ---------------- 3 · Pièces ---------------- */
function DocRow({ kind, file, editable }: { kind: KycDocKind; file: ClientFile; editable: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<StepResult | null, FormData>(uploadDocAction, null);
  const have = file.documents.find((d) => d.kind === kind);
  /* SEUL LE SELFIE EST UNE PHOTO PAR NATURE. La pièce d identité était rangée
     avec lui, donc elle n acceptait que « image/* » : un client qui a le scan
     PDF de son passeport, ce qui est le cas le plus soigné, ne pouvait pas le
     donner. Le justificatif de domicile acceptait déjà les deux, et c est la
     bonne forme : on la lui applique. */
  const photoish = kind === "selfie";
  // The photo is shrunk on the phone before the upload, then handed to the server action.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const f = fd.get("file");
    const go = (file: File | null) => {
      if (file) fd.set("file", file);
      startTransition(() => action(fd));
    };
    if (f instanceof File && f.size > 0) shrinkPhoto(f).then(go, () => go(null));
    else go(null);
  };
  return (
    <form onSubmit={onSubmit} className={`${styles.docRow} ${have ? styles.docHave : ""}`}>
      <input type="hidden" name="kind" value={kind} />
      <div className={styles.docLabel}>
        <b>{t(DOC_LABEL[kind])}</b>
        {have ? (
          <small className={styles.okText}>
            Reçue · {have.fileName} · {fmtDateTime(have.uploadedAt)}
          </small>
        ) : (
          <small className="muted">{kind === "selfie" ? "Prenez-vous en photo, ou choisissez-en une : visage dégagé, bon éclairage." : "Photo nette ou PDF."}</small>
        )}
        <Msg state={state} />
      </div>
      <fieldset disabled={!editable} className={styles.docInput}>
        {/* PAS DE « capture » : avec lui, le téléphone ouvre la caméra et rien
            d'autre. Sans lui, il propose caméra OU galerie, et celui qui a
            déjà une photo de lui n'a pas à la reprendre. */}
        <input type="file" name="file" accept={photoish ? "image/*" : "image/*,application/pdf"} required />
        <button className="btn sm" type="submit" disabled={pending}>
          {pending ? "Envoi…" : have ? "Remplacer" : "Envoyer"}
        </button>
      </fieldset>
    </form>
  );
}

export function DocsSection({ file, editable }: P) {
  const t = useT();
  const req = requiredDocs(file.kind, file.identity.residentAbroad);
  const extra = file.documents.filter((d) => !req.includes(d.kind));
  return (
    <section className={styles.sec}>
      <h2 className="display">{t("3 · Pièces justificatives")}</h2>
      <p className={styles.hint}>{t("Photographiez chaque pièce avec votre téléphone : une photo nette suffit, elle est réduite avant l'envoi. Une pièce vous manque ? Envoyez le dossier quand même : un conseiller vous la demandera. Les originaux sont conservés de façon chiffrée et ne servent qu'à la vérification de votre identité.")}</p>
      <div className={styles.docs}>
        {req.map((k) => (
          <DocRow key={k} kind={k} file={file} editable={editable} />
        ))}
        {/* Listées par leur clef et non par leur genre : elles portent toutes
            « autre », et une liste indexée sur le genre n'en montrait qu'une. */}
        {extra.map((d) => (
          <PieceLibre key={d.fileKey} doc={d} editable={editable} />
        ))}
        <AjouterPiece editable={editable} />
      </div>
    </section>
  );
}

/** Une pièce que le client a jointe de lui-même : son libellé, et le retrait. */
function PieceLibre({ doc, editable }: { doc: KycDocument; editable: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<StepResult | null, FormData>(removeDocAction, null);
  return (
    <form action={action} className={`${styles.docRow} ${styles.docHave}`}>
      <input type="hidden" name="fileKey" value={doc.fileKey} />
      <div className={styles.docLabel}>
        <b>{doc.label ?? t(DOC_LABEL[doc.kind])}</b>
        <small className={styles.okText}>
          {t("Reçue")} · {doc.fileName} · {fmtDateTime(doc.uploadedAt)}
        </small>
        <Msg state={state} />
      </div>
      <fieldset disabled={!editable} className={styles.docInput}>
        <button className="btn sm ghost" type="submit" disabled={pending}>
          {t(pending ? "Retrait…" : "Retirer")}
        </button>
      </fieldset>
    </form>
  );
}

/**
 * Joindre une pièce que nous n'avons pas demandée.
 *
 * La liste des pièces attendues est fermée, et c'est juste : elle dit ce qu'il
 * faut pour ouvrir un compte. Mais un client a souvent de quoi répondre
 * d'avance à la question suivante, un bulletin de paie, un acte de vente, une
 * attestation d'employeur, et il n'avait nulle part où le mettre : le genre
 * « autre » existait sans que rien ne l'offre, et il n'acceptait qu'un fichier.
 *
 * Le libellé part avec le fichier : « Autre pièce » dans un dossier oblige le
 * conseiller à l'ouvrir pour savoir ce que c'est.
 */
function AjouterPiece({ editable }: { editable: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<StepResult | null, FormData>(uploadDocAction, null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const f = fd.get("file");
    const go = (petit: File | null) => {
      if (petit) fd.set("file", petit);
      startTransition(() => action(fd));
    };
    if (f instanceof File && f.size > 0) shrinkPhoto(f).then(go, () => go(null));
    else go(null);
  };
  return (
    <form onSubmit={onSubmit} className={styles.docRow}>
      <input type="hidden" name="kind" value="autre" />
      <div className={styles.docLabel}>
        <b>{t("Joindre une autre pièce")}</b>
        <small className="muted">{t("Tout ce qui peut aider : bulletin de paie, acte de vente, attestation. Dites en deux mots ce que c'est.")}</small>
        <Msg state={state} />
      </div>
      <fieldset disabled={!editable} className={styles.docInput}>
        <input type="text" name="label" maxLength={80} placeholder={t("Ce que c'est")} required />
        <input type="file" name="file" accept="image/*,application/pdf" required />
        <button className="btn sm" type="submit" disabled={pending}>
          {t(pending ? "Envoi…" : "Envoyer")}
        </button>
      </fieldset>
    </form>
  );
}

/* ---------------- 4 · Fonds & profil ---------------- */
export function FundsSection({ file, editable }: P) {
  const t = useT();
  const [state, action, pending] = useActionState<StepResult | null, FormData>(saveFundsProfileAction, null);
  const f = file.funds;
  const p = file.profile;
  return (
    <section className={styles.sec}>
      <h2 className="display">{t("4 · Origine des fonds et profil investisseur")}</h2>
      <form action={action} className={styles.form}>
        <fieldset disabled={!editable} className={styles.grid}>
          <label className="field">
            {t("Origine des fonds investis")}
            <Select block name="source" value={f.source ?? ""} options={[{ value: "", label: "—" }, { value: "Revenus professionnels / salaires", label: t("Revenus professionnels / salaires") }, { value: "Épargne accumulée", label: t("Épargne accumulée") }, { value: "Revenus d'activité de l'entreprise", label: t("Revenus d'activité de l'entreprise") }, { value: "Cotisations des membres", label: t("Cotisations des membres") }, { value: "Cession d'actifs / héritage", label: t("Cession d'actifs / héritage") }, { value: "Autre (préciser dans le message au desk)", label: t("Autre (préciser dans le message au desk)") }]} />
          </label>
          <label className="field">
            {t("Montant envisagé sur 12 mois (FCFA)")}
            <Select block name="expectedAmount" value={f.expectedAmount ?? ""} options={[{ value: "", label: "—" }, { value: "Moins de 5 millions", label: t("Moins de 5 millions") }, { value: "5 à 25 millions", label: t("5 à 25 millions") }, { value: "25 à 100 millions", label: t("25 à 100 millions") }, { value: "Plus de 100 millions", label: t("Plus de 100 millions") }]} />
          </label>
          <label className="field">
            {t("Banque du compte de règlement (au nom du client)")}
            <input name="bankName" defaultValue={f.bankName} placeholder={t("Ex. Afriland First Bank")} />
          </label>
          <label className="field">
            {t("RIB / IBAN de ce compte : y sont virés vos produits de vente, de rachat, coupons et remboursements")}
            <input name="bankAccount" defaultValue={f.bankAccount} placeholder="Ex. CM21 10005 00001 12345678901 23" inputMode="text" autoComplete="off" />
          </label>
          <label className="field">
            {t("Intitulé du compte (doit être le vôtre)")}
            <input name="bankHolder" defaultValue={f.bankHolder} placeholder={t("Nom tel qu'il figure sur le RIB")} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="pep" defaultChecked={f.pep} /> {t("Je suis (ou un proche est) une personne politiquement exposée")}
          </label>
          <label className="field">
            {t("Si oui, précisez")}
            <input name="pepDetails" defaultValue={f.pepDetails} />
          </label>
          <label className="field">
            {t("Objectif principal")}
            <Select block name="objectives" value={p.objectives ?? ""} options={[{ value: "", label: "—" }, { value: "Revenus réguliers (coupons)", label: t("Revenus réguliers (coupons)") }, { value: "Préserver le capital", label: t("Préserver le capital") }, { value: "Faire croître le capital", label: t("Faire croître le capital") }, { value: "Placer une trésorerie", label: t("Placer une trésorerie") }]} />
          </label>
          <label className="field">
            {t("Horizon")}
            <Select block name="horizon" value={p.horizon ?? ""} options={[{ value: "", label: "—" }, { value: "Moins d'un an", label: t("Moins d'un an") }, { value: "1 à 3 ans", label: t("1 à 3 ans") }, { value: "3 à 5 ans", label: t("3 à 5 ans") }, { value: "Plus de 5 ans", label: t("Plus de 5 ans") }]} />
          </label>
          <label className="field">
            {t("Expérience des titres")}
            <Select block name="experience" value={p.experience ?? ""} options={[{ value: "", label: "—" }, { value: "Aucune", label: t("Aucune") }, { value: "Bons ou obligations du Trésor déjà détenus", label: t("Bons ou obligations du Trésor déjà détenus") }, { value: "Actions cotées déjà détenues", label: t("Actions cotées déjà détenues") }, { value: "Professionnel de la finance", label: t("Professionnel de la finance") }]} />
          </label>
          <label className="field">
            {t("Tolérance au risque")}
            <Select block name="riskTolerance" value={p.riskTolerance ?? ""} options={[{ value: "", label: "—" }, { value: "Aucune perte acceptable", label: t("Aucune perte acceptable") }, { value: "Petites fluctuations acceptables", label: t("Petites fluctuations acceptables") }, { value: "Pertes temporaires acceptables pour un meilleur rendement", label: t("Pertes temporaires acceptables pour un meilleur rendement") }]} />
          </label>
          <label className="field">
            {t("Capacité à supporter une perte")}
            <Select block name="lossCapacity" value={p.lossCapacity ?? ""} options={[{ value: "", label: "—" }, { value: "Faible : ces fonds sont nécessaires à court terme", label: t("Faible : ces fonds sont nécessaires à court terme") }, { value: "Moyenne", label: t("Moyenne") }, { value: "Élevée : épargne de long terme", label: t("Élevée : épargne de long terme") }]} />
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

/* ---------------- 5 · Consentements ---------------- */
export function ConsentSection({ file, editable }: P) {
  const t = useT();
  const [state, action, pending] = useActionState<StepResult | null, FormData>(saveConsentsAction, null);
  const c = file.consents;
  return (
    <section className={styles.sec}>
      <h2 className="display">{t("5 · Consentements")}</h2>
      <p className={styles.hint}>{t("Le premier est nécessaire pour que nous puissions instruire votre dossier. Le second est libre, et se retire à tout moment. L'acceptation de la convention, elle, vient après l'approbation, et elle a sa propre page.")}</p>
      <form action={action} className={styles.form}>
        <fieldset disabled={!editable} className={styles.consents}>
          <label className={styles.check}>
            <input type="checkbox" name="data" defaultChecked={Boolean(c.dataAt)} required /> {t("J'accepte le traitement de mes données pour l'ouverture et la tenue de mon compte (obligatoire).")}
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="whatsapp" defaultChecked={Boolean(c.whatsappAt)} /> {t("J'accepte de recevoir les offres et avis sur WhatsApp (STOP à tout moment).")}
          </label>
        </fieldset>
        <Msg state={state} />
        {c.dataAt && <p className={styles.okText}>{t("Consentement aux données donné le {d}.", { d: fmtDateTime(c.dataAt) })}</p>}
        <div className={styles.actions}>
          <Save pending={pending} editable={editable} />
        </div>
      </form>
    </section>
  );
}

/* ---------------- Après l'approbation · la convention ---------------- */
/**
 * LA CONVENTION N'EST PLUS ICI : ELLE A SA PAGE.
 *
 * Ce bloc a porté pendant des mois huit puces d'« essentiel », le lien vers le
 * texte complet et la signature, au milieu d'un écran qui parlait aussi
 * d'identité, de pièces et de profil. « Un mélange des genres », dit le
 * 9 octobre 2026 : trois tâches de natures différentes dans une page, et la
 * seule qui engage le client était la moins visible.
 *
 * Il ne reste donc qu'une CARTE : l'état de la convention, et la porte. Le
 * texte, la balance et la signature vivent sur /ouvrir-un-compte/convention,
 * qui est leur domicile. Ce qui se dit ici se dit en une phrase, et jamais
 * deux fois : une carte qui résumerait les engagements referait le mélange.
 */
export function ConventionSection({ file, signable, enTete = false }: { file: ClientFile; signable: boolean; /** Elle ouvre la page parce qu'elle attend un geste : le filet d'or le dit. */ enTete?: boolean }) {
  const t = useT();
  const c = file.consents;
  /* « ACCEPTÉE » DOIT VOULOIR DIRE « ET IL N'Y A PLUS RIEN À SIGNER ».
     Mesuré à l'écran le 9 octobre 2026, à la première reprise : la page
     annonçait « Votre convention a changé », l'étiquette disait « convention
     à reprendre », et ce bloc affichait tranquillement « Convention acceptée
     le 7 octobre ». Il lisait la date, qui existe toujours après une reprise ;
     c'est `signable` qui porte la question. */
  const accepted = Boolean(c.conventionAt) && !signable;
  const reprise = Boolean(c.conventionAt) && signable;
  return (
    <section className={`${styles.sec} ${enTete ? styles.secAction : ""}`}>
      <h2 className="display">{t("Votre convention")}</h2>
      <p className={styles.hint}>
        {t(
          accepted
            ? "Elle est acceptée : votre exemplaire daté est dans vos documents, et vous pouvez la relire quand vous voulez."
            : reprise
              ? "Le texte a changé sur un point qui vous engage. Sa page dit lequel, puis vous la reprenez par un code à usage unique."
              : signable
                ? "Dernière étape : elle se lit et se signe sur sa page, par un code à usage unique."
                : "Rien ne se signe avant l'approbation de votre dossier. Vous pouvez la lire dès maintenant, sur sa page.",
        )}
      </p>
      <div className={styles.actions}>
        <Link className={`btn ${signable ? "primary" : "sm"}`} href="/ouvrir-un-compte/convention">
          {t(accepted ? "Relire ma convention" : reprise ? "Relire et reprendre ma convention" : signable ? "Lire et signer ma convention" : "Lire la convention")}
        </Link>
      </div>
    </section>
  );
}

/* ---------------- 6 · Soumettre ---------------- */
export function SubmitSection({ file, editable, missing }: P & { missing: string[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<StepResult | null, FormData>(submitFileAction, null);
  if (!editable) return null;
  return (
    <section className={styles.sec}>
      <h2 className="display">{t("6 · Envoyer mon dossier")}</h2>
      {missing.length > 0 ? (
        <p className={styles.hint}>
          {/* Chaque manque se traduit à part : la phrase qui les assemble était
              seule à passer par t(), et la liste restait en français. */}
          {t("Encore à compléter :")} <b>{missing.map((m) => t(m)).join(", ")}</b>.
        </p>
      ) : (
        <p className={styles.hint}>{t("Tout y est. Un conseiller vérifie votre dossier et vous prévient dès l'ouverture du compte.")}</p>
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
