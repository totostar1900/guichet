"use client";

import { useRouter } from "next/navigation";
import { reculer } from "./mobile/retour";
import styles from "./PagePleine.module.css";

/** La croix d'une page pleine : recule, ou va à l'accueil. */
export function FermerLaPage({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button type="button" className={styles.croix} onClick={() => reculer(router, "/")} aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
