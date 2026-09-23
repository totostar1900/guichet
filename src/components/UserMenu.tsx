import Link from "next/link";
import type { Session } from "@/lib/auth/types";
import type { AccountProps } from "./mobile/AccountMenu";
import { AccountMenu } from "./mobile/AccountMenu";
import styles from "./UserMenu.module.css";
import { getT } from "@/i18n/server";

/**
 * Le compte, dans la barre de bureau.
 *
 * Au large : le nom, le segment, la pastille des initiales, tout cela menant
 * à l’espace du client. Sous 900 px, c’est-à-dire sur un téléphone couché, le
 * nom ne tient plus et la pastille seule ne menait nulle part : elle ouvre
 * alors la même feuille que le portrait, coordonnées, préférences et sortie
 * comprises. Un compte, un endroit, quelle que soit l’orientation.
 */
export async function UserMenu({ session, deskUi, account }: { session: Session | null; deskUi?: boolean; account?: AccountProps }) {
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
      {account && (
        <span className={styles.compact}>
          <AccountMenu {...account} />
        </span>
      )}
      <Link href={t(deskUi ? "/desk" : "/moi")} className={styles.who}>
        <b>{session.name}</b>
        <span>{deskUi ? "Desk" : t(session.segment)}</span>
      </Link>
      <Link href={t(deskUi ? "/desk" : "/moi")} className={`${styles.avatar} ${deskUi ? styles.desk : ""} ${account ? styles.full : ""}`} title={session.email ?? session.segment}>
        {initials}
      </Link>
      {session.role === "client" && session.tier < 2 && (
        <Link href="/ouvrir-un-compte" className={styles.open} title={t("Ouvrir mon compte-titres")}>
          {t(session.kycStatus === "soumis" || session.kycStatus === "en_revue" ? "Dossier en revue" : session.kycStatus === "complements" ? "Compléter mon dossier" : session.kycStatus === "approuve" ? "Compte en cours d'ouverture" : "Ouvrir un compte")}
        </Link>
      )}
    </div>
  );
}
