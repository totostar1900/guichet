import { redirect } from "next/navigation";
import { authMode, getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/config";
import { EmailOtpForm } from "./EmailOtpForm";
import { devLogin, googleLogin } from "./actions";
import { Select } from "@/components/ui/Select";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";
import { ReplayPresentation } from "@/components/mobile/Presentation";
import { DeviceSignIn } from "./DeviceSignIn";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Connexion") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const { next = "/", erreur } = await searchParams;
  if (await getSession()) redirect(next.startsWith("/") ? next : "/");
  const mode = authMode();
  const t = await getT();
  /**
   * Ouvrir un compte passe par ici, et la page doit le dire.
   *
   * Le dossier d'ouverture est garde par `requireSession` : on prouve d'abord
   * un canal, e-mail, WhatsApp ou Google, puis on remplit son dossier. Le flux
   * est juste, mais l'accueil repete « Ouvrir un compte-titres » et le visiteur
   * atterrissait sur « Se connecter » : il y lisait un mur au lieu du premier
   * pas. Les mots changent, le chemin ne change pas.
   */
  const ouvrir = next.startsWith("/ouvrir-un-compte");

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className="eyebrow">{COMPANY.name}</div>
        <h1 className="display">{ouvrir ? t("Ouvrir votre compte-titres") : t("Se connecter")}</h1>
        {ouvrir && <p className={styles.lead}>{t("Première étape : recevez un code pour prouver votre adresse. Votre dossier s'ouvre juste après, et vous le remplissez à votre rythme.")}</p>}
        {erreur === "lien" && <p className={styles.notice}>{t("Ce lien de connexion a expiré, ou a déjà servi (certaines messageries ouvrent les liens avant vous). Demandez un nouveau lien ci-dessous : il arrive en quelques secondes.")}</p>}
        {erreur === "google" && <p className={styles.notice}>{t("La connexion par Google n'a pas abouti. Le code par e-mail ci-dessous fonctionne toujours.")}</p>}
        <DeviceSignIn next={next} />
        {mode === "supabase" ? (
          <>
            {/* La phrase de tête a déjà été dite à qui vient ouvrir un compte. */}
            {!ouvrir && <p className={styles.lead}>{t(process.env.PHONE_OTP_ENABLED === "1" ? "Recevez un code à usage unique par e-mail, par WhatsApp ou par SMS. Aucun mot de passe à retenir." : "Recevez un code à usage unique par e-mail. Aucun mot de passe à retenir.")}</p>}
            {/* La porte Google est proposée avant le code : elle est plus courte,
                et l'adresse qu'elle rend est déjà vérifiée par Google. Elle ne
                paraît que si le fournisseur est activé côté Supabase. */}
            {process.env.GOOGLE_OAUTH_ENABLED === "1" && (
              <>
                <form action={googleLogin} className={styles.google}>
                  <input type="hidden" name="next" value={next} />
                  <button type="submit">
                    <svg viewBox="0 0 48 48" aria-hidden="true" width="16" height="16">
                      <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.5 5-4.4 7l6.7 5.2C42.2 36.2 45 30.7 45 24z" />
                      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.9-12.5-9.2l-7.1 5.5C8.1 41 15.4 46 24 46z" />
                      <path fill="#FBBC05" d="M11.5 28.3A13.4 13.4 0 0 1 10.8 24c0-1.5.3-3 .7-4.3l-7.1-5.6A22 22 0 0 0 2 24c0 3.6.9 6.9 2.4 9.9z" />
                      <path fill="#EA4335" d="M24 10.3c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.1 29.9 2 24 2 15.4 2 8.1 7 4.4 14.1l7.1 5.6C13.3 14.2 18.2 10.3 24 10.3z" />
                    </svg>
                    {t("Continuer avec Google")}
                  </button>
                </form>
                <div className={styles.ou}>
                  <span>{t("ou")}</span>
                </div>
              </>
            )}
            <EmailOtpForm next={next} phoneEnabled={process.env.PHONE_OTP_ENABLED === "1"} withCode={Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.SUPABASE_SERVICE_ROLE_KEY)} />
            <p className={styles.discover}>
              {t("Vous découvrez Guichet ?")} <ReplayPresentation className="btn sm ghost" label={t("Trente secondes pour comprendre")} />
            </p>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              <b>{t("Mode démonstration")}</b> : {t("aucun backend configuré. Choisissez un rôle pour parcourir Guichet comme un client ou comme le desk. En production, la connexion se fait par code e-mail ou WhatsApp.")}
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
  );
}
