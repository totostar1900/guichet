"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { estIci, ongletsDuSiege } from "@/lib/nav-onglets";
import styles from "./OngletsMarche.module.css";

/**
 * La rangée du siège Instruments. Elle ne tient pas sa liste : « nav-onglets »
 * la lui donne, et porte la décision et ce qu'elle corrige, dont la raison
 * pour laquelle le marché n'en a pas.
 *
 * Chaque onglet porte le nom court de sa page, quand elle en a un : « Le
 * marché » devient « Vue d'ensemble », parce qu'à côté de ses propres pages le
 * nom de la famille ne dirait rien de plus que la pastille allumée.
 */
export function OngletsMarche() {
  const path = usePathname();
  const t = useT();
  const pages = ongletsDuSiege(path);
  /* Hors du siège Instruments, elle n'a rien à dire : le marché a ses
     pastilles et son rail. Se retirer ici plutôt que de compter sur les pages
     pour ne pas la poser, parce qu'une page de plus naîtrait en la posant. */
  if (pages.length === 0) return null;
  return (
    <nav className={styles.onglets} aria-label={t("Ce qui s'achète")}>
      {pages.map((p) => (
        <Link key={p.key} href={p.href} className={styles.onglet} aria-current={estIci(p, path) ? "page" : undefined}>
          {t(p.short ?? p.label)}
        </Link>
      ))}
    </nav>
  );
}
