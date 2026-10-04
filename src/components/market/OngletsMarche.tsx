"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { estIci, ongletsDuSiege } from "@/lib/nav-onglets";
import { isInstrumentsSection } from "@/lib/nav-section";
import styles from "./OngletsMarche.module.css";

/**
 * La rangée du siège où l'on est, et d'un seul. Elle ne tient pas sa liste :
 * « nav-onglets » la lui donne, et porte la décision et ce qu'elle corrige.
 *
 * Chaque onglet porte le nom court de sa page, quand elle en a un : « Le
 * marché » devient « Vue d'ensemble », parce qu'à côté de ses propres pages le
 * nom de la famille ne dirait rien de plus que la pastille allumée.
 */
export function OngletsMarche() {
  const path = usePathname();
  const t = useT();
  const instruments = isInstrumentsSection(path);
  return (
    <nav className={styles.onglets} aria-label={t(instruments ? "Ce qui s'achète" : "Les pages du marché")}>
      {ongletsDuSiege(path).map((p) => (
        <Link key={p.key} href={p.href} className={styles.onglet} aria-current={estIci(p, path) ? "page" : undefined}>
          {t(p.short ?? p.label)}
        </Link>
      ))}
    </nav>
  );
}
