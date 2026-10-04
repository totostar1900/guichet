"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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
  { href: "/calendrier", label: "Adjudications", match: (p: string) => p.startsWith("/calendrier") },
  { href: "/indice", label: "Indice et analyses", match: (p: string) => p.startsWith("/indice") || p.startsWith("/societes") || p.startsWith("/emetteurs") },
];

export function OngletsMarche() {
  const path = usePathname();
  const t = useT();
  const bar = useRef<HTMLElement>(null);

  /* LA RANGÉE SE RETIRE QUAND ON DESCEND, et revient dès qu'on remonte. Le
     seuil existe pour qu'elle ne clignote pas : sans lui, le moindre rebond
     d'un pixel la ferait disparaître et revenir pendant la lecture. Près du
     haut elle revient toujours, on ne cache pas ce qui est à portée. */
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const SEUIL = 24;
    let dernier = window.scrollY;
    let prevu = false;
    const juger = () => {
      prevu = false;
      const y = window.scrollY;
      if (Math.abs(y - dernier) < SEUIL) return;
      const bas = y > dernier;
      dernier = y;
      const reduit = bas && y > 80 ? "oui" : "non";
      el.dataset.reduit = reduit;
      /* LA PAGE ENTIERE LE SAIT, parce que la bande des sections colle SOUS
         celle-ci et doit monter prendre les quarante pixels qu elle libere.
         Deux modules CSS ne se parlent pas ; la racine, si. */
      document.documentElement.dataset.onglets = reduit === "oui" ? "reduits" : "";
    };
    const onScroll = () => {
      if (prevu) return;
      prevu = true;
      requestAnimationFrame(juger);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav ref={bar} className={styles.onglets} data-reduit="non" aria-label={t("Les pages du marché")}>
      {ONGLETS.map((o) => (
        <Link key={o.href} href={o.href} className={styles.onglet} aria-current={o.match(path) ? "page" : undefined}>
          {t(o.label)}
        </Link>
      ))}
    </nav>
  );
}
