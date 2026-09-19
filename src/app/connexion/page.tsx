import { redirect } from "next/navigation";
import { authMode, getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/config";
import { EmailOtpForm } from "./EmailOtpForm";
import { devLogin } from "./actions";
import { Select } from "@/components/ui/Select";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";
import { ReplayPresentation } from "@/components/mobile/Presentation";
import { DeviceSignIn } from "./DeviceSignIn";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const { next = "/", erreur } = await searchParams;
  if (await getSession()) redirect(next.startsWith("/") ? next : "/");
  const mode = authMode();
  const t = await getT();

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className="eyebrow">{COMPANY.name}</div>
        <h1 className="display">{t("Se connecter")}</h1>
        {erreur === "lien" && <p className={styles.notice}>{t("Ce lien de connexion a expiré, ou a déjà servi (certaines messageries ouvrent les liens avant vous). Demandez un nouveau code ci-dessous : il arrive en quelques secondes.")}</p>}
        <DeviceSignIn next={next} />
        {mode === "supabase" ? (
          <>
            <p className={styles.lead}>{t(process.env.PHONE_OTP_ENABLED === "1" ? "Recevez un code à usage unique par e-mail, par WhatsApp ou par SMS. Aucun mot de passe à retenir." : "Recevez un code à usage unique par e-mail. Aucun mot de passe à retenir.")}</p>
            <EmailOtpForm next={next} phoneEnabled={process.env.PHONE_OTP_ENABLED === "1"} />
            <p className={styles.discover}>
              {t("Vous découvrez Guichet ?")} <ReplayPresentation className="btn sm ghost" label={t("Trente secondes pour comprendre")} />
            </p>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              <b>{t("Mode démonstration")}</b> : {t("aucun backend configuré. Choisissez un rôle pour parcourir le Guichet comme un client ou comme le desk. En production, la connexion se fait par code e-mail ou WhatsApp.")}
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
                  <Select block name="role" value="responsable" options={[{ value: "desk", label: t("Opérateur desk") }, { value: "responsable", label: t("Responsable") }]} />
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
