import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { emptyClientFile } from "@/lib/domain/kyc";
import { KIND_LABEL, missingForSubmission, STATUS_LABEL } from "@/lib/kyc/checklist";
import { fmtDateTime } from "@/lib/format";
import { setKindAction } from "./actions";
import { ConsentSection, DocsSection, FundsSection, IdentitySection, PersonsSection, SubmitSection } from "./Sections";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ouvrir un compte" };

const KINDS = ["physique", "morale", "groupement", "institutionnel"] as const;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ soumis?: string; next?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession("/ouvrir-un-compte");
  const r = repo();
  let file = await r.getClientFileByUser(s.userId);
  if (!file) file = await r.createClientFile(emptyClientFile(s.userId, "physique", s.name, { phone: s.phone, email: s.email }));
  const editable = file.status === "brouillon" || file.status === "complements";
  const missing = missingForSubmission(file);

  const steps: [string, boolean][] = [
    ["Type de client", true],
    ["Identité", Boolean(file.identity.name && (file.identity.phone || file.identity.email) && (file.kind !== "physique" || file.identity.idNumber))],
    ["Pièces", !missing.some((m) => m.includes("pièce") || m.includes("selfie") || m.includes("justificatif") || m.includes("rib") || m.includes("niu") || m.includes("rccm") || m.includes("statuts") || m.includes("pv") || m.includes("récépissé") || m.includes("liste") || m.includes("matrice") || m.includes("déclaration"))],
    ["Fonds & profil", Boolean(file.funds.source && file.profile.objectives)],
    ["Convention", Boolean(file.consents.conventionAt)],
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">Ouverture de compte-titres</div>
          <h1 className="display">{file.status === "approuve" ? (file.review.custodianAccount ? "Votre compte est actif" : "Dossier approuvé — compte en cours d'ouverture") : "Ouvrir mon compte"}</h1>
          <p className={styles.lead}>
            Dix minutes sur votre téléphone : votre identité, quelques pièces en photo, l&apos;origine des fonds et votre profil, puis l&apos;acceptation de la convention par code. Un conseiller valide sous 24 h pour un résident, 48 h avec un appel vidéo depuis l&apos;étranger.
          </p>
        </div>
        <div className={styles.status}>
          <span className={`${styles.pill} ${styles[`st_${file.status}`]}`}>{STATUS_LABEL[file.status]}</span>
          {file.submittedAt && <small className="muted">soumis le {fmtDateTime(file.submittedAt)}</small>}
          {file.status === "complements" && file.review.requestedItems && <div className={styles.request}>Compléments demandés : {file.review.requestedItems}</div>}
          {file.status === "approuve" && file.review.custodianAccount && <small className="muted">sous-compte n° {file.review.custodianAccount}</small>}
          {file.status === "approuve" && (
            <Link href={sp.next && sp.next.startsWith("/") ? sp.next : "/"} className="btn primary sm">
              Aller au Guichet
            </Link>
          )}
        </div>
      </div>

      {sp.soumis === "1" && file.status === "soumis" && <div className={styles.okBanner}>Dossier reçu. Nous vous prévenons {file.consents.whatsappAt ? "sur WhatsApp" : "par e-mail"} dès la décision — en général sous 24 h ouvrées.</div>}

      <ol className={styles.rail}>
        {steps.map(([label, done], i) => (
          <li key={label} className={done ? styles.done : ""}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <section className={styles.sec}>
        <h2 className="display">1 · Type de client</h2>
        <form action={setKindAction} className={styles.kinds}>
          {KINDS.map((k) => (
            <button key={k} name="kind" value={k} type="submit" disabled={!editable} className={`${styles.kind} ${file.kind === k ? styles.kindOn : ""}`}>
              <b>{KIND_LABEL[k]}</b>
              <span>
                {k === "physique" && "CNI ou passeport, justificatif de domicile, RIB, NIU."}
                {k === "morale" && "RCCM, statuts, pouvoirs, bénéficiaires effectifs (> 25 %)."}
                {k === "groupement" && "Association déclarée, ou indivision de mandataires jusqu'à 25 M FCFA ; PV désignant les mandataires et la règle de décision."}
                {k === "institutionnel" && "Assureur, caisse, trésorerie d'entreprise : matrice des signataires et plafonds."}
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
