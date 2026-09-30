import Link from "next/link";
import type { Session } from "@/lib/auth/types";
import type { AccountProps } from "./mobile/AccountMenu";
import { AccountMenu } from "./mobile/AccountMenu";
import styles from "./UserMenu.module.css";
import { getT } from "@/i18n/server";

/**
 * Le compte, dans la barre de bureau.
 *
 * LA PASTILLE OUVRE LE COMPTE, À TOUTE LARGEUR. Elle ne le faisait que sous
 * 900 px : au large, elle menait au portefeuille, et le profil, la sécurité et
 * les pièces n'étaient atteignables que par la feuille « ⋮ ». Un même axe tenu
 * par deux surfaces n'est tenu par aucune, et c'est exactement ce qui rendait
 * les réglages du compte introuvables sur un écran de bureau.
 *
 * Le nom reste un lien vers le portefeuille : il nomme la personne, et la
 * personne veut le plus souvent revoir ce qu'elle possède.
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
      <Link href={deskUi ? "/desk" : "/"} className={styles.who}>
        <b>{session.name}</b>
        <span>{deskUi ? "Desk" : t(session.segment)}</span>
      </Link>
      <Link href={deskUi ? "/desk" : "/"} className={`${styles.avatar} ${deskUi ? styles.desk : ""} ${account ? styles.full : ""}`} title={session.email ?? session.segment}>
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
