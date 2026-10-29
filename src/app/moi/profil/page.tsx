import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { ProfileQuiz } from "./ProfileQuiz";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Profil d'investisseur") };
}

/**
 * Seven questions, a profile, four measures: what the client told us of
 * themselves. Open to visitors too, for information: their profile stays on
 * the device until they sign in and keep it.
 *
 * ─── TROIS NOMS POUR UNE PAGE, et un fil d'Ariane de plus ──────────────────
 *
 * Elle s'appelait « Mon profil » dans la table des pages, « Mon profil
 * financier » dans l'onglet et dans son fil, et son « h1 » n'était NI l'un
 * ni l'autre : c'était la QUESTION courante du questionnaire. Un titre qui
 * change à chaque réponse, un nom de page nulle part, et la seule page de
 * l'application hors de l'échelle — 19,5 px là où les trente-cinq autres
 * titrent à 30.
 *
 * LE FIL D'ARIANE ÉTAIT LE SECOND, pas le dernier. L'étalon avait retiré
 * celui de « Sécurité » en le croyant seul de l'application ; celui-ci a
 * survécu parce que la page n'était pas dans le relevé des treize. Il disait
 * « Portefeuille › Mon profil financier » — le sur-titre le dit en plus
 * court, et le retour le dit en cliquable.
 *
 * La question du questionnaire reste en tête de son bloc, mais en « h2 » :
 * c'est un titre de section, pas le nom de la page.
 */
export default async function ProfilPage() {
  const s = await getSession();
  const [t, profile] = await Promise.all([getT(), s ? repo().getFinancialProfile(s.userId) : undefined]);
  return (
    <Glissement>
      <div className={styles.wrap}>
        {/* Le visiteur arrive par la page des éclairages, qui cite ce
            questionnaire : le retour nomme la page d'où il vient. */}
        <EnTete
          retour={s ? { href: "/moi/compte", mot: t("Votre compte") } : { href: "/info/eclairages", mot: t("Éclairages") }}
          surTitre={s ? t("Vous") : undefined}
          titre={t("Profil d'investisseur")}
          phrase={t("Votre horizon, votre tolérance au risque, et ce que la maison en déduit.")}
        />
        {!s && (
          <p className={styles.guestNote}>
            <b>{t("À titre d'information")}</b> · {t("Dix-sept questions en trois blocs, cinq minutes, un profil : il reste sur cet appareil. Avec un compte, il rejoint votre dossier et les fiches vous montrent vos repères.")}
          </p>
        )}
        <ProfileQuiz initial={profile} guest={!s} />
      </div>
    </Glissement>
  );
}
