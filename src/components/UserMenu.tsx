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
      <div className={styles.who}>
        <b>{session.name}</b>
        <span>{session.role === "desk" ? "Desk" : session.segment}</span>
      </div>
      <div className={`${styles.avatar} ${session.role === "desk" ? styles.desk : ""}`} title={session.email ?? session.segment}>
        {initials}
      </div>
      <form action={logout}>
        <button type="submit" className={styles.out} title="Se déconnecter" aria-label="Se déconnecter">
          ⏻
        </button>
      </form>
    </div>
  );
}
