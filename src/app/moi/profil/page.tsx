import Link from "next/link";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { ProfileQuiz } from "./ProfileQuiz";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mon profil financier") };
}

/**
 * Seven questions, a profile, four measures: what the client told us of
 * themselves. Open to visitors too, for information: their profile stays on
 * the device until they sign in and keep it.
 */
export default async function ProfilPage() {
  const s = await getSession();
  const [t, profile] = await Promise.all([getT(), s ? repo().getFinancialProfile(s.userId) : undefined]);
  return (
    <div className={styles.wrap}>
      <div className="eyebrow">
        {s ? <Link href="/moi">{t("Mon espace")}</Link> : <Link href="/info">{t("Guide")}</Link>} › {t("Mon profil financier")}
      </div>
      {!s && (
        <p className={styles.guestNote}>
          <b>{t("À titre d'information")}</b> · {t("Sept questions, deux minutes, un profil : il reste sur cet appareil. Avec un compte, il rejoint votre dossier et les fiches vous montrent vos repères.")}
        </p>
      )}
      <ProfileQuiz initial={profile} guest={!s} />
    </div>
  );
}
