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
 * « Le marché » devient « Vue d'ensemble » ici seulement : dans la feuille du
 * dock le nom complet dit de quoi parle la famille, sur un onglet large de six
 * il ne tiendrait pas, et à côté de ses propres pages il ne dirait rien de
 * plus que la pastille allumée.
 */
export function OngletsMarche() {
  const path = usePathname();
  const t = useT();
  const instruments = isInstrumentsSection(path);
  return (
    <nav className={styles.onglets} aria-label={t(instruments ? "Ce qui s'achète" : "Les pages du marché")}>
      {ongletsDuSiege(path).map((p) => (
        <Link key={p.key} href={p.href} className={styles.onglet} aria-current={estIci(p, path) ? "page" : undefined}>
          {t(p.key === "marche" ? "Vue d'ensemble" : (p.short ?? p.label))}
        </Link>
      ))}
    </nav>
  );
}
