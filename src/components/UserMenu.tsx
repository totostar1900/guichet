import Link from "next/link";
import { logout } from "@/app/connexion/actions";
import type { Session } from "@/lib/auth/types";
import styles from "./UserMenu.module.css";

export function UserMenu({ session }: { session: Session | null }) {
  if (!session)
    return (
      <Link href="/connexion" className={styles.login}>
        Se connecter
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
      <Link href={session.role === "desk" ? "/desk" : "/moi"} className={styles.who}>
        <b>{session.name}</b>
        <span>{session.role === "desk" ? "Desk" : session.segment}</span>
      </Link>
      <div className={`${styles.avatar} ${session.role === "desk" ? styles.desk : ""}`} title={session.email ?? session.segment}>
        {initials}
      </div>
      {session.role === "client" && session.tier < 2 && (
        <Link href="/ouvrir-un-compte" className={styles.open} title="Ouvrir mon compte-titres">
          {session.kycStatus === "soumis" || session.kycStatus === "en_revue" ? "Dossier en revue" : session.kycStatus === "complements" ? "Compléter mon dossier" : session.kycStatus === "approuve" ? "Compte en cours d'ouverture" : "Ouvrir un compte"}
        </Link>
      )}
      <form action={logout}>
        <button type="submit" className={styles.out} title="Se déconnecter" aria-label="Se déconnecter">
          ⏻
        </button>
      </form>
    </div>
  );
}
