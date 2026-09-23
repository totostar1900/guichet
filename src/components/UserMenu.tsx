import Link from "next/link";
import type { Session } from "@/lib/auth/types";
import styles from "./UserMenu.module.css";
import { getT } from "@/i18n/server";

export async function UserMenu({ session, deskUi }: { session: Session | null; deskUi?: boolean }) {
  const t = await getT();
  if (!session)
    return (
      <Link href="/connexion" className={styles.login}>
        {t("Se connecter")}
      </Link>
    );
  const initials = session.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className={styles.menu}>
      <Link href={t(deskUi ? "/desk" : "/moi")} className={styles.who}>
        <b>{session.name}</b>
        <span>{deskUi ? "Desk" : t(session.segment)}</span>
      </Link>
      <div className={`${styles.avatar} ${deskUi ? styles.desk : ""}`} title={session.email ?? session.segment}>
        {initials}
      </div>
      {session.role === "client" && session.tier < 2 && (
        <Link href="/ouvrir-un-compte" className={styles.open} title={t("Ouvrir mon compte-titres")}>
          {t(session.kycStatus === "soumis" || session.kycStatus === "en_revue" ? "Dossier en revue" : session.kycStatus === "complements" ? "Compléter mon dossier" : session.kycStatus === "approuve" ? "Compte en cours d'ouverture" : "Ouvrir un compte")}
        </Link>
      )}
    </div>
  );
}
