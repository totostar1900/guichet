"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useT } from "@/i18n/client";
import { basculerFavori } from "./actions";
import styles from "./favoris.module.css";

/** L'étoile pleine d'une page favorite : la toucher la retire. */
export function RetirerFavori({ href, titre }: { href: string; titre: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={styles.etoile}
      disabled={pending}
      aria-pressed="true"
      aria-label={t("Retirer des favoris")}
      title={t("Retirer des favoris")}
      onClick={() =>
        start(async () => {
          const r = await basculerFavori(href, titre, false);
          if (r.ok) router.refresh();
        })
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.6l-5.5 2.9 1-6.2L3 9.9l6.2-.9z" />
      </svg>
    </button>
  );
}
