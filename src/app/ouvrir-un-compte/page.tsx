import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { emptyClientFile } from "@/lib/domain/kyc";
import { conventionSignable, KIND_LABEL, missingForSubmission, STATUS_LABEL } from "@/lib/kyc/checklist";
import { fmtDateTime } from "@/lib/format";
import { setKindAction } from "./actions";
import { ConsentSection, ConventionSection, DocsSection, FundsSection, IdentitySection, PersonsSection, SubmitSection } from "./Sections";
import { canalDuCode } from "@/lib/kyc/canal";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Ouvrir un compte") };
}

const KINDS = ["physique", "morale", "groupement", "institutionnel"] as const;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ soumis?: string; next?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const s = await requireSession("/ouvrir-un-compte");
  const r = repo();
  const enregistre = await r.getClientFileByUser(s.userId);
  /* LE DOSSIER NE NAÎT PLUS D'UN REGARD.
     Ouvrir la page créait la ligne en base, avant la moindre saisie : le desk
     voyait arriver des dossiers vides, et le visiteur lisait « Brouillon » au-
     dessus d'un formulaire qu'il n'avait pas commencé. La ligne naît désormais à
     la première sauvegarde, par les actions (voir myFile). Ici, une fiche
     d'affichage suffit : elle n'est écrite nulle part, et son identifiant vide
     dit qu'elle n'existe pas encore. */
  const file = enregistre ?? { id: "", ...emptyClientFile(s.userId, "physique", s.name, { phone: s.phone, email: s.email }) };
  const editable = file.status === "brouillon" || file.status === "complements";
  const missing = missingForSubmission(file);
  const signable = conventionSignable(file);
  /* La destination du code se lit à l'écran avant de l'envoyer : le canal prouvé
     à la connexion passe devant le champ du formulaire (voir lib/kyc/canal). */
  const canal = file.consents.conventionAt ? undefined : await canalDuCode(s.userId, file);
  /* Le même bloc, à deux places selon le moment : en tête quand il attend un
     geste, en pied quand il n'est plus qu'une pièce du dossier. */
  const conventionBloc = <ConventionSection file={file} signable={signable} canal={canal} enTete={signable} />;

  const steps: [string, boolean][] = [
    [t("Type de client"), true],
    [t("Identité"), Boolean(file.identity.name && (file.identity.phone || file.identity.email) && (file.kind !== "physique" || file.identity.idNumber))],
    [t("Pièces"), file.documents.length > 0],
    [t("Fonds & profil"), Boolean(file.funds.source && file.profile.objectives)],
    [t("Consentements"), Boolean(file.consents.dataAt)],
  ];
  /* La convention n'est pas une étape du formulaire : elle vient après la
     décision du desk. Elle n'apparaît au rail qu'une fois qu'elle est à portée. */
  if (file.status === "approuve" || file.consents.conventionAt) steps.push([t("Convention"), Boolean(file.consents.conventionAt)]);
  /* « Brouillon » est le mot de la base, et le desk a raison de le garder. Au
     client il ne dit rien de vrai : son dossier est en cours, pas à l'état
     d'ébauche ; et « approuvé » ne veut plus dire « compte actif » tant que la
     convention n'est pas acceptée. */
  const etat =
    file.status === "brouillon"
      ? "En cours"
      : file.status === "approuve"
        ? signable
          ? "Approuvé : convention à accepter"
          : // « Approuvé : compte actif » annonçait un compte actif avant que le teneur n'ait rendu le sous-compte, à deux lignes d'un titre qui disait le contraire.
            file.review.custodianAccount
            ? "Approuvé : compte actif"
            : "Approuvé : compte en cours d'ouverture"
        : STATUS_LABEL[file.status];

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Ouverture de compte-titres")}</div>
          <h1 className="display">{t(file.status === "approuve" ? (signable ? "Dossier approuvé : acceptez votre convention" : file.review.custodianAccount ? "Votre compte est actif" : "Dossier approuvé : compte en cours d'ouverture") : "Ouvrir mon compte")}</h1>
          <p className={styles.lead}>
            {/* Une fois le dossier approuvé, l'accroche ne reprend pas
                l'argumentaire du début : elle dit où en est le compte. */}
            {t(
              signable
                ? "Votre dossier est approuvé. Dernière étape : acceptez la convention par un code à usage unique, ci-dessous. Nous ouvrons ensuite le sous-compte à votre nom chez le teneur de compte."
                : file.status === "approuve"
                  ? file.review.custodianAccount
                    ? "Votre convention est acceptée et votre sous-compte est ouvert à votre nom : vous pouvez passer des prises fermes. Votre exemplaire de la convention est dans vos documents."
                    : "Votre convention est acceptée. Le sous-compte à votre nom s'ouvre chez le teneur de compte, en général sous 24 à 48 h ; nous vous confirmons son numéro dès réception."
                  : "Dix minutes sur votre téléphone : votre identité, quelques pièces en photo, l'origine des fonds et votre profil. Un conseiller valide sous 24 h pour un résident, 48 h avec un appel vidéo depuis l'étranger ; vous n'acceptez la convention qu'une fois votre dossier approuvé.",
            )}
          </p>
        </div>
        <div className={styles.status}>
          {/* Rien à annoncer tant que rien n'est enregistré : une pastille d'état
              au-dessus d'un formulaire vierge ne décrit aucun état. */}
          {enregistre && <span className={`${styles.pill} ${styles[`st_${file.status}`]}`}>{t(etat)}</span>}
          {file.submittedAt && <small className="muted">{t("soumis le")} {fmtDateTime(file.submittedAt)}</small>}
          {file.status === "complements" && file.review.requestedItems && <div className={styles.request}>{t("Compléments demandés")} : {file.review.requestedItems}</div>}
          {file.status === "approuve" && file.review.custodianAccount && <small className="muted">{t(`sous-compte n° ${file.review.custodianAccount}`)}</small>}
          {/* Pas d'invitation à partir tant qu'il reste la signature à donner. */}
          {file.status === "approuve" && !signable && (
            <Link href={sp.next && sp.next.startsWith("/") ? sp.next : "/"} className="btn primary sm">
              {t("Aller à Guichet")}
            </Link>
          )}
        </div>
      </div>

      {sp.soumis === "1" && file.status === "soumis" && (
        <div className={styles.okBanner}>
          {t("Dossier reçu. Nous vous prévenons")} {t(file.consents.whatsappAt ? "sur WhatsApp" : "par e-mail")} {t("dès la décision : en général sous 24 h ouvrées. Vous accepterez la convention ici même, par code, une fois le dossier approuvé.")}
        </div>
      )}

      {/* CE QUI RESTE À FAIRE PASSE DEVANT CE QUI EST DÉJÀ FAIT.
          Quand le dossier est approuvé, la convention est la SEULE chose qui
          attende le client : tout le reste de la page est son dossier, en
          lecture seule. Elle vivait pourtant tout en bas, après six sections
          verrouillées, à trois mille pixels du haut dans une fenêtre de neuf
          cents : le 8 octobre 2026 le bouton n'a pas reçu trois clics de suite,
          les miens compris, parce qu'il n'était jamais là où on le visait. Et
          l'accroche promettait « ci-dessous », ce qui n'était vrai qu'au prix
          d'un très long défilement. */}
      {signable && conventionBloc}

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
      {/* Tant qu'elle n'est pas à portée, ou qu'elle est déjà signée, la
          convention ferme la page : dans l'ordre du temps, elle vient après
          l'envoi du dossier et après la décision du desk. */}
      {!signable && conventionBloc}
    </div>
  );
}
