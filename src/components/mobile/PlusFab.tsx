"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { PLUS_PAGES, pagePlusDe } from "@/lib/plus/pages";
import { Sheet } from "./Sheet";
import styles from "./MarketFab.module.css";

/**
 * LE BOUTON FLOTTANT DES PAGES OUVERTES PAR « PLUS » (9 novembre 2026).
 *
 * « Plus », sur l'Accueil, ouvre un menu : ordres et intentions, sondages, coupons, rentabilité, provision, versements, prélèvements, documents, tous les services. Une fois sur l'une de ces pages, il fallait repasser par l'Accueil
 * pour aller à une autre. Ce bouton reprend les mêmes entrées, en bas à gauche, dans la grammaire du bouton des pages du marché (il en partage la feuille de style) : un rond de 34 px, une feuille du bas qui se ferme en la tirant.
 *
 * Il ne paraît que sur les pages que « Plus » ouvre, sous-pages comprises, et jamais sur la page où l'on se tient déjà dans la liste (retirée, comme le fait le bouton du marché).
 */
export function PlusFab() {
  const chemin = usePathname();
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const monte = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const ici = pagePlusDe(chemin);
  if (!monte || !ici) return null;
  const voisines = PLUS_PAGES.filter((p) => p.cle !== ici.cle);
  return createPortal(
    <>
      <button type="button" className={styles.fab} onClick={() => setOuvert(true)} aria-haspopup="dialog" aria-label={t("Plus")} title={t("Plus")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
        </svg>
      </button>
      <Sheet open={ouvert} onClose={() => setOuvert(false)} title={t("Plus")} dock="bottom-left">
        <nav className={styles.liste} aria-label={t("Plus")}>
          {voisines.map((p) => (
            <Link key={p.cle} href={p.href} onClick={() => setOuvert(false)}>
              <b>{t(p.mot)}</b>
            </Link>
          ))}
        </nav>
      </Sheet>
    </>,
    document.body,
  );
}
