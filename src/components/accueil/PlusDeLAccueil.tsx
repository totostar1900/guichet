"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { PLUS_PAGES } from "@/lib/plus/pages";
import { ICONES_DE_PLUS } from "@/lib/plus/icones";
import { useFermeDehors } from "@/lib/ui/ferme-dehors";
import styles from "./PlusDeLAccueil.module.css";

/**
 * « PLUS », LE MENU ANCRÉ DE L'ACCUEIL (9 novembre 2026, planche « Cartes, adjudications, portefeuille », 3B).
 *
 * Le portefeuille n'est plus une page (`/portefeuille` renvoie à l'Accueil) et ses morceaux vivaient éparpillés dans `/moi`. Les quatre gestes ronds de l'Accueil gardent ce qui se fait chaque jour (Verser, Retrait, Investir) ;
 * « Plus » ouvre, ancré à son rond, ce qui se fait chaque semaine ou chaque mois : ordres et intentions, sondages, coupons à réinvestir (un point vert quand il y a quelque chose à faire), rentabilité, provision, versements,
 * prélèvements, documents. « Tous les services » ferme la liste : c'était la destination de « Plus » avant ce menu, elle reste à un toucher.
 */

export function PlusDeLAccueil({ classeRaccourci, classeRond, pointCoupons }: { classeRaccourci: string; classeRond: string; /** Des coupons attendent un réinvestissement : le point vert. */ pointCoupons: boolean }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useFermeDehors(boite, ouvert, () => setOuvert(false));
  const entrees = PLUS_PAGES.map((p) => ({ ...p, point: p.cle === "coupons" ? pointCoupons : undefined }));
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
              <path d={ICONES_DE_PLUS[e.cle]} />
            </svg>
            <span>{t(e.mot)}</span>
            {e.point && <i className={styles.point} aria-label={t("à faire")} />}
          </Link>
        ))}
      </div>
    </div>
  );
}
