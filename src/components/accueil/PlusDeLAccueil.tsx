"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { useFermeDehors } from "@/lib/ui/ferme-dehors";
import styles from "./PlusDeLAccueil.module.css";

/**
 * « PLUS », LE MENU ANCRÉ DE L'ACCUEIL (9 novembre 2026, planche « Cartes, adjudications, portefeuille », 3B).
 *
 * Le portefeuille n'est plus une page (`/portefeuille` renvoie à l'Accueil) et ses morceaux vivaient éparpillés dans `/moi`. Les quatre gestes ronds de l'Accueil gardent ce qui se fait chaque jour (Verser, Retrait, Investir) ;
 * « Plus » ouvre, ancré à son rond, ce qui se fait chaque semaine ou chaque mois : ordres et intentions, sondages, coupons à réinvestir (un point vert quand il y a quelque chose à faire), rentabilité, provision, versements,
 * prélèvements, documents. « Tous les services » ferme la liste : c'était la destination de « Plus » avant ce menu, elle reste à un toucher.
 */
const ICONES: Record<string, string> = {
  ordres: "M6 3h9l4 4v14H6z M9 12h6 M9 16h6",
  sondages: "M4 5h16v11H9l-5 4z",
  coupons: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3 M18 3v4h-4 M6 21v-4h4",
  rentabilite: "M4 18l6-6 4 4 6-8 M16 8h4v4",
  provision: "M3 7h18v12H3z M16 13h2",
  versements: "M4 6h16v14H4z M4 10h16 M9 3v4 M15 3v4",
  prelevements: "M12 4v12 M7 11l5 5 5-5 M5 20h14",
  documents: "M3 6h7l2 2h9v11H3z",
  services: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
};

export function PlusDeLAccueil({ classeRaccourci, classeRond, pointCoupons }: { classeRaccourci: string; classeRond: string; /** Des coupons attendent un réinvestissement : le point vert. */ pointCoupons: boolean }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useFermeDehors(boite, ouvert, () => setOuvert(false));
  const entrees: { cle: keyof typeof ICONES; href: string; mot: string; point?: boolean }[] = [
    { cle: "ordres", href: "/moi/ordres", mot: "Mes ordres et intentions" },
    { cle: "sondages", href: "/sondage", mot: "Mes sondages" },
    { cle: "coupons", href: "/moi/reinvestir", mot: "Mes coupons à réinvestir", point: pointCoupons },
    { cle: "rentabilite", href: "/moi/performance", mot: "Ma rentabilité" },
    { cle: "provision", href: "/moi/provision", mot: "Ma provision" },
    { cle: "versements", href: "/moi/epargne", mot: "Mes versements" },
    { cle: "prelevements", href: "/moi/prelevements", mot: "Mes prélèvements" },
    { cle: "documents", href: "/moi/documents", mot: "Mes documents" },
    { cle: "services", href: "/trader", mot: "Tous les services" },
  ];
  return (
    <div className={styles.boite} ref={boite}>
      <button type="button" className={classeRaccourci} onClick={() => setOuvert((o) => !o)} aria-haspopup="menu" aria-expanded={ouvert}>
        <span className={classeRond} aria-hidden="true">
          ⋯
        </span>
        {pointCoupons && <i className={styles.pointDuRond} aria-hidden="true" />}
        <small>{t("Plus")}</small>
      </button>
      <div className={styles.menu} data-ouvert={ouvert} role="menu" aria-label={t("Plus")} inert={!ouvert}>
        {entrees.map((e) => (
          <Link key={e.cle} href={e.href} role="menuitem" className={styles.entree} onClick={() => setOuvert(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={ICONES[e.cle]} />
            </svg>
            <span>{t(e.mot)}</span>
            {e.point && <i className={styles.point} aria-label={t("à faire")} />}
          </Link>
        ))}
      </div>
    </div>
  );
}
