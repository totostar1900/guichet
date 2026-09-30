"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { isFundsSection, isTitresSection, TITRES } from "@/lib/nav-section";
import styles from "./OngletsMarche.module.css";

/**
 * Les onglets de la section « Marché ».
 *
 * TITRES ET FONDS NE FUSIONNENT PAS, ILS SE RANGENT. La bande leur donnait deux
 * sièges pour deux façons d'acheter au même endroit ; les mettre dans une même
 * liste aurait été l'erreur inverse, parce qu'un fonds ne se lit pas comme une
 * ligne. Sa valeur liquidative porte une date, ses frais comptent, il n'a ni
 * coupon ni échéance : les colonnes ne sont pas les mêmes, donc la table ne peut
 * pas l'être. Ils partagent un siège et gardent chacun sa page.
 *
 * Les séances annoncées passent devant les deux : c'est ce qui est périssable.
 */
const ONGLETS = [
  { href: "/marche", label: "Vue d'ensemble", match: (p: string) => p === "/marche" },
  { href: TITRES, label: "Titres", match: isTitresSection },
  { href: "/fonds", label: "Fonds", match: isFundsSection },
  { href: "/calendrier", label: "Séances", match: (p: string) => p.startsWith("/calendrier") },
  { href: "/indice", label: "Indice et analyses", match: (p: string) => p.startsWith("/indice") || p.startsWith("/societes") || p.startsWith("/emetteurs") },
];

export function OngletsMarche() {
  const path = usePathname();
  const t = useT();
  return (
    <nav className={styles.onglets} aria-label={t("Les pages du marché")}>
      {ONGLETS.map((o) => (
        <Link key={o.href} href={o.href} className={styles.onglet} aria-current={o.match(path) ? "page" : undefined}>
          {t(o.label)}
        </Link>
      ))}
    </nav>
  );
}
