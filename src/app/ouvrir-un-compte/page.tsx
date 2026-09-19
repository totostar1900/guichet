import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { emptyClientFile } from "@/lib/domain/kyc";
import { KIND_LABEL, missingForSubmission, STATUS_LABEL } from "@/lib/kyc/checklist";
import { fmtDateTime } from "@/lib/format";
import { setKindAction } from "./actions";
import { ConsentSection, DocsSection, FundsSection, IdentitySection, PersonsSection, SubmitSection } from "./Sections";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ouvrir un compte" };

const KINDS = ["physique", "morale", "groupement", "institutionnel"] as const;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ soumis?: string; next?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const s = await requireSession("/ouvrir-un-compte");
  const r = repo();
  let file = await r.getClientFileByUser(s.userId);
  if (!file) file = await r.createClientFile(emptyClientFile(s.userId, "physique", s.name, { phone: s.phone, email: s.email }));
  const editable = file.status === "brouillon" || file.status === "complements";
  const missing = missingForSubmission(file);

  const steps: [string, boolean][] = [
    [t("Type de client"), true],
    [t("Identité"), Boolean(file.identity.name && (file.identity.phone || file.identity.email) && (file.kind !== "physique" || file.identity.idNumber))],
    [t("Pièces"), file.documents.length > 0],
    [t("Fonds & profil"), Boolean(file.funds.source && file.profile.objectives)],
    [t("Convention"), Boolean(file.consents.conventionAt)],
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Ouverture de compte-titres")}</div>
          <h1 className="display">{t(file.status === "approuve" ? (file.review.custodianAccount ? "Votre compte est actif" : "Dossier approuvé : compte en cours d'ouverture") : "Ouvrir mon compte")}</h1>
          <p className={styles.lead}>
            {t("Dix minutes sur votre téléphone : votre identité, quelques pièces en photo, l'origine des fonds et votre profil, puis l'acceptation de la convention par code. Un conseiller valide sous 24 h pour un résident, 48 h avec un appel vidéo depuis l'étranger.")}
          </p>
        </div>
        <div className={styles.status}>
          <span className={`${styles.pill} ${styles[`st_${file.status}`]}`}>{t(STATUS_LABEL[file.status])}</span>
          {file.submittedAt && <small className="muted">{t("soumis le")} {fmtDateTime(file.submittedAt)}</small>}
          {file.status === "complements" && file.review.requestedItems && <div className={styles.request}>{t("Compléments demandés")} : {file.review.requestedItems}</div>}
          {file.status === "approuve" && file.review.custodianAccount && <small className="muted">{t(`sous-compte n° ${file.review.custodianAccount}`)}</small>}
          {file.status === "approuve" && (
            <Link href={sp.next && sp.next.startsWith("/") ? sp.next : "/"} className="btn primary sm">
              {t("Aller au Guichet")}
            </Link>
          )}
        </div>
      </div>

      {sp.soumis === "1" && file.status === "soumis" && <div className={styles.okBanner}>Dossier reçu. Nous vous prévenons {t(file.consents.whatsappAt ? "sur WhatsApp" : "par e-mail")} dès la décision : en général sous 24 h ouvrées.</div>}

      <ol className={styles.rail}>
        {steps.map(([label, done], i) => (
          <li key={label} className={done ? styles.done : ""}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <section className={styles.sec}>
        <h2 className="display">{t("1 · Type de client")}</h2>
        <form action={setKindAction} className={styles.kinds}>
          {KINDS.map((k) => (
            <button key={k} name="kind" value={k} type="submit" disabled={!editable} className={`${styles.kind} ${file.kind === k ? styles.kindOn : ""}`}>
              <b>{t(KIND_LABEL[k])}</b>
              <span>
                {k === "physique" && t("CNI ou passeport, justificatif de domicile, RIB, NIU.")}
                {k === "morale" && t("RCCM, statuts, pouvoirs, bénéficiaires effectifs (> 25 %).")}
                {k === "groupement" && t("Association déclarée, ou indivision de mandataires jusqu'à 25 M FCFA ; PV désignant les mandataires et la règle de décision.")}
                {k === "institutionnel" && t("Assureur, caisse, trésorerie d'entreprise : matrice des signataires et plafonds.")}
              </span>
            </button>
          ))}
        </form>
      </section>

      <IdentitySection file={file} editable={editable} />
      {file.kind !== "physique" && <PersonsSection file={file} editable={editable} />}
      <DocsSection file={file} editable={editable} />
      <FundsSection file={file} editable={editable} />
      <ConsentSection file={file} editable={editable} />
      <SubmitSection file={file} editable={editable} missing={missing} />
    </div>
  );
}
