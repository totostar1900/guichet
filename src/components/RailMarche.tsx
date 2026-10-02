"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { MARCHE_PAGES } from "@/lib/nav-groups";
import { currentMarketPage } from "@/lib/market/pages";
import { isMarcheSection } from "@/lib/nav-section";
import styles from "./RailMarche.module.css";

/**
 * LES PAGES DU MARCHÉ, À GAUCHE, PENDANT LA LECTURE.
 *
 * La famille se disait déjà, mais au PIED de l'article, dans la bande « Sur le
 * même sujet » : il fallait avoir lu la page pour apprendre qu'il y en avait
 * d'autres. Six pages qui ne se connaissent qu'après coup forment six
 * impasses, et c'est ainsi que la page de l'indice s'est retrouvée sans rien
 * qui pointe vers elle.
 *
 * Le rail lit la même table que les deux barres, `nav-groups`. Trois listes de
 * la même famille divergeraient, et la bande du pied reste : elle sert le
 * téléphone, qui n'a pas la place d'une colonne.
 */
export function RailMarche({ children }: { children: ReactNode }) {
  const path = usePathname();
  const t = useT();
  const ici = currentMarketPage(path);
  /* Le rail décide lui-même s'il a lieu d'être, et la mise en page vit donc à
     UN endroit. Le poser page par page demanderait douze retouches, et la
     treizième page naîtrait sans rail sans que personne ne le voie. */
  if (!isMarcheSection(path)) return <>{children}</>;
  return (
    <div className={styles.avecRail}>
      <nav className={styles.rail} aria-label={t("Les pages du marché")}>
        <span className={styles.titre}>{t("Marché")}</span>
        {MARCHE_PAGES.map((p) => (
          <Link key={p.key} href={p.href} aria-current={p.key === ici ? "page" : undefined}>
            {t(p.short ?? p.label)}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
