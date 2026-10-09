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
      {/* ON N'OFFRE PAS D'OUVRIR CE QUI EST DÉJÀ EN TRAIN DE S'OUVRIR.
          Le bouton paraissait à tous les paliers sous 2, et répétait donc son
          invitation à un client dont le dossier dormait chez nous, en revue. Un
          appel à l'action qui ne mène à rien qu'on puisse faire se lit comme un
          reproche. Il ne reste que dans deux cas : rien n'est commencé, ou
          quelque chose attend la main du client. L'attente, elle, se lit dans la
          feuille du compte et sur la page du dossier, à leur place. */}
      {session.role === "client" && session.tier < 2 && (!session.kycStatus || session.kycStatus === "complements" || (session.kycStatus === "approuve" && !session.conventionAccepted)) && (
        <Link href={session.kycStatus === "approuve" ? "/ouvrir-un-compte/convention" : "/ouvrir-un-compte"} className={styles.open} title={t("Ouvrir mon compte-titres")}>
          {t(session.kycStatus === "complements" ? "Compléter mon dossier" : session.kycStatus === "approuve" ? "Accepter ma convention" : "Ouvrir un compte titres")}
        </Link>
      )}
    </div>
  );
}
