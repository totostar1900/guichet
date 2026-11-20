import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { authMode, getSession } from "@/lib/auth";
import { isDeskHost } from "@/lib/hosts";
import { COMPANY } from "@/lib/config";
import { EmailOtpForm } from "./EmailOtpForm";
import { devLogin } from "./actions";
import { Select } from "@/components/ui/Select";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";
import { PorteDeConnexion } from "./PorteDeConnexion";
import { Glissement } from "@/components/mobile/Glissement";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Connexion") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string; creer?: string }> }) {
  const { next = "/", erreur, creer } = await searchParams;
  /* LA REDIRECTION REMPLACE L ENTRÉE D HISTORIQUE, ELLE NE S Y AJOUTE PAS.
     Un visiteur déjà connecté qui passait par /connexion était renvoyé plus
     loin, et le bouton « page précédente » le ramenait sur /connexion, qui le
     renvoyait aussitôt : la flèche du navigateur paraissait cassée alors
     qu elle marchait trop bien. Remplacer l entrée retire la page du chemin
     de retour, qui est sa place : une redirection n est pas une étape. */
  if (await getSession()) redirect(next.startsWith("/") ? next : "/", RedirectType.replace);
  const mode = authMode();
  const t = await getT();
  /* CRÉER UN COMPTE A SON PARCOURS : /connexion/creer (adresse, numéro, mentions, code de l'appareil, biométrie). Cette page ne garde que « Se connecter ». Le desk, lui, n'a pas de création. */
  const administrationHote = isDeskHost((await headers()).get("host"));
  if ((creer === "1" || next.startsWith("/ouvrir-un-compte")) && !administrationHote) redirect(`/connexion/creer?next=${encodeURIComponent(next)}`, RedirectType.replace);
  /**
   * Ouvrir un compte passe par ici, et la page doit le dire.
   *
   * Le dossier d'ouverture est garde par `requireSession` : on prouve d'abord
   * un canal, e-mail ou WhatsApp, puis on remplit son dossier. Le flux
   * est juste, mais l'accueil repete « Ouvrir un compte-titres » et le visiteur
   * atterrissait sur « Se connecter » : il y lisait un mur au lieu du premier
   * pas. Les mots changent, le chemin ne change pas.
   */
  const ouvrir = next.startsWith("/ouvrir-un-compte");
  /**
   * LA TROISIÈME PORTE, ENFIN NOMMÉE.
   *
   * Elle existait déjà et personne ne la voyait : la page publique n'offrait
   * que « Se connecter » et « Ouvrir un compte-titres », et la seconde
   * réclamait une pièce d'identité à quelqu'un qui venait de découvrir la
   * maison. Entre les deux il y a le geste le moins cher et le plus utile :
   * créer son compte, prouver un canal, et regarder le marché. Le dossier
   * vient après, quand le visiteur l'a décidé.
   *
   * LE CHEMIN NE CHANGE PAS, les mots changent : le même code, la même
   * session, le même dossier au cran « brouillon ». Ce qui change, c'est ce
   * qu'on promet en échange du geste.
   */
  const creerUnCompte = creer === "1" && !ouvrir;
  /**
   * L'ADMINISTRATION N'EST PAS UNE VITRINE.
   *
   * Le desk vit sur son adresse, et cette page est la seule chose qu'un
   * visiteur non connecté y atteint. Elle portait pourtant les mots de
   * Guichet : « Vous découvrez Guichet ? Trente secondes pour comprendre »,
   * et, en pied, le guide, l'aide et les risques. Rien de confidentiel, mais
   * rien d'utile non plus : personne n'ouvre un compte-titres sur la console
   * de la maison, et chaque phrase de plus est une surface de plus.
   *
   * Une page d'administration dit trois choses : chez qui on est, ce qu'il
   * faut faire pour entrer, et la mention légale. Le reste s'en va.
   */
  const administration = isDeskHost((await headers()).get("host"));
  /* Le canal téléphone existe pour le client, et seulement pour lui : voir la
     note sur la phrase d'accueil, plus bas. */
  const telephoneOuvert = process.env.PHONE_OTP_ENABLED === "1" && !administration;

  return (
    <Glissement>
      <div className={styles.wrap}>
        <div className={`${styles.card} ${mode === "supabase" ? "" : styles.large}`.trim()}>
          <div className="eyebrow">{COMPANY.name}</div>
          {mode === "supabase" ? (
            <PorteDeConnexion
              next={next}
              enTete={
                <>
            <h1 className="display">{ouvrir ? t("Ouvrir votre compte-titres") : creerUnCompte ? t("Créer votre compte") : t("Se connecter")}</h1>
            {ouvrir && <p className={styles.lead}>{t("Première étape : recevez un code pour prouver votre adresse. Votre dossier s'ouvre juste après, et vous le remplissez à votre rythme.")}</p>}
            {creerUnCompte && <p className={styles.lead}>{t("Un code, une minute, et vous voyez le marché : les taux, les séances annoncées et les publications. Aucun document n'est demandé à ce stade, et créer un compte ne vous engage à rien.")}</p>}
            {erreur === "lien" && <p className={styles.notice}>{t("Ce lien de connexion a expiré, ou a déjà servi (certaines messageries ouvrent les liens avant vous). Demandez un nouveau lien ci-dessous : il arrive en quelques secondes.")}</p>}
                {/* La phrase de tête a déjà été dite à qui vient ouvrir ou créer un compte. */}
                {/* LA CONSOLE N'A QU'UN CANAL, L'E-MAIL. WhatsApp et le SMS
                    servent un client qu'on joint là où il vit ; un opérateur a
                    une adresse professionnelle, et c'est elle qui porte son
                    habilitation. Deux canaux de plus, c'est deux surfaces de
                    plus sur la porte de l'administration, pour personne. */}
                {!ouvrir && !creerUnCompte && <p className={styles.lead}>{t(telephoneOuvert ? "Recevez un code à usage unique par e-mail, par WhatsApp ou par SMS. Aucun mot de passe à retenir." : "Recevez un code à usage unique par e-mail. Aucun mot de passe à retenir.")}</p>}
                {/* AUCUNE PORTE GOOGLE (19 novembre 2026, le client : « on veut les informations réelles, ce qui n'est pas toujours le cas en passant par Google »). Un profil Google rend le nom et l'adresse que la personne y a mis ; le dossier d'ouverture demande ceux de sa pièce d'identité. */}
                </>
              }
            >
              <EmailOtpForm next={administration ? next : `/connexion/creer?next=${encodeURIComponent(next)}`} phoneEnabled={telephoneOuvert} withCode={Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.SUPABASE_SERVICE_ROLE_KEY)} />
            </PorteDeConnexion>
          ) : (
            <>
            <h1 className="display">{ouvrir ? t("Ouvrir votre compte-titres") : creerUnCompte ? t("Créer votre compte") : t("Se connecter")}</h1>
            {ouvrir && <p className={styles.lead}>{t("Première étape : recevez un code pour prouver votre adresse. Votre dossier s'ouvre juste après, et vous le remplissez à votre rythme.")}</p>}
            {creerUnCompte && <p className={styles.lead}>{t("Un code, une minute, et vous voyez le marché : les taux, les séances annoncées et les publications. Aucun document n'est demandé à ce stade, et créer un compte ne vous engage à rien.")}</p>}
            {erreur === "lien" && <p className={styles.notice}>{t("Ce lien de connexion a expiré, ou a déjà servi (certaines messageries ouvrent les liens avant vous). Demandez un nouveau lien ci-dessous : il arrive en quelques secondes.")}</p>}
              <p className={styles.lead}>
                <b>{t("Mode démonstration")}</b> : {t(administration ? "aucun backend configuré. Choisissez un rôle pour parcourir Guichet comme un client ou comme le desk. En production, la connexion se fait par code e-mail." : "aucun backend configuré. Choisissez un rôle pour parcourir Guichet comme un client ou comme le desk. En production, la connexion se fait par code e-mail ou WhatsApp.")}
              </p>
              <div className={styles.two}>
                <form action={devLogin} className={styles.devForm}>
                  <input type="hidden" name="role" value="client" />
                  <input type="hidden" name="next" value={next} />
                  <h2>{t("Client")}</h2>
                  <label className="field">
                    {t("Nom affiché")}
                    <input name="name" defaultValue="G. Nitcheu" required minLength={2} />
                  </label>
                  <label className="field">
                    {t("Segment")}
                    <Select block name="segment" value="Personne physique · Yaoundé" options={["Personne physique · Yaoundé", "Personne physique · Douala", "Diaspora · Paris", "Groupement · Yaoundé", "Entreprise · Bangui", "Institutionnel · Libreville"].map((v) => ({ value: v, label: t(v) }))} />
                  </label>
                  <label className="field">
                    {t("Numéro, pour entrer par un accès nommé")}
                    <input name="phone" placeholder="+237600000077" autoComplete="off" />
                  </label>
                  <button className="btn primary" type="submit">
                    {t("Entrer comme client")}
                  </button>
                </form>
                <form action={devLogin} className={styles.devForm}>
                  <input type="hidden" name="next" value={next.startsWith("/desk") ? next : "/desk"} />
                  <h2>Desk</h2>
                  <label className="field">
                    {t("Conseiller")}
                    <input name="name" defaultValue="Georges" required minLength={2} />
                  </label>
                  <label className="field">
                    {t("Niveau")}
                    <Select block name="role" value="responsable" options={[{ value: "desk", label: t("Opérateur") }, { value: "responsable", label: t("Responsable du desk") }]} />
                  </label>
                  <p className={styles.hint}>{t("Accès au carnet, aux intentions et à la publication des prix.")}</p>
                  <button className="btn" type="submit">
                    {t("Entrer comme desk")}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </Glissement>
  );
}
