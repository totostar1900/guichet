import Link from "next/link";
import { requireSession } from "@/lib/auth";
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

/** Seven questions, a profile, four measures: what the client told us of themselves, never advice. */
export default async function ProfilPage() {
  const s = await requireSession("/moi/profil");
  const [t, profile] = await Promise.all([getT(), repo().getFinancialProfile(s.userId)]);
  return (
    <div className={styles.wrap}>
      <div className="eyebrow">
        <Link href="/moi">{t("Mon espace")}</Link> › {t("Mon profil financier")}
      </div>
      <ProfileQuiz initial={profile} />
    </div>
  );
}
