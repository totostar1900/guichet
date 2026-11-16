"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import styles from "./page.module.css";

/**
 * LES TROIS GESTES DE L'ARGENT, EN RONDS SOUS LE SOLDE (16 novembre 2026, planche « Mon argent », 1A) : les mêmes que sur Activité, et un tap de moins pour verser ou retirer.
 * « Verser » ouvre une feuille, parce qu'il a trois portes : une fois par virement, chaque mois par prélèvement, ou chaque mois dans un fonds.
 */
export function GestesDeLArgent({ mandatId }: { mandatId?: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <div className={styles.gestes}>
        <button type="button" className={styles.geste} onClick={() => setOuvert(true)}>
          <span className={styles.rond} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <b>{t("Verser")}</b>
        </button>
        <Link href="/moi/provision/placer" className={styles.geste}>
          <span className={styles.rond} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 7h11l-3-3M17 17H6l3 3" />
            </svg>
          </span>
          <b>{t("Placer")}</b>
        </Link>
        <Link href="/moi/provision/reprendre" className={styles.geste}>
          <span className={styles.rond} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14" />
            </svg>
          </span>
          <b>{t("Retirer")}</b>
        </Link>
      </div>
      <Sheet open={ouvert} onClose={() => setOuvert(false)} title={t("Verser")}>
        <div className={styles.tuiles}>
          <Link href="/moi/provision/alimenter/virement" className={styles.tuile}>
            <span>
              <b>{t("Une fois, par virement")}</b>
              <small>{t("Une fois : c'est vous qui l'envoyez, depuis votre banque, quand vous voulez.")}</small>
            </span>
            <i aria-hidden="true">›</i>
          </Link>
          <Link href={mandatId ? `/moi/prelevements/${mandatId}` : "/moi/prelevements/nouveau"} className={styles.tuile}>
            <span>
              <b>{t("Chaque mois, par prélèvement")}</b>
              <small>{mandatId ? `${t("Déjà en place")} : ${t("ouvrez votre mandat.")}` : t("Chaque mois : vous autorisez une somme, et c'est nous qui le prenons, sur votre compte bancaire.")}</small>
            </span>
            <i aria-hidden="true">›</i>
          </Link>
          <Link href="/moi/epargne/nouvelle" className={styles.tuile}>
            <span>
              <b>{t("Chaque mois, dans un fonds")}</b>
              <small>{t("Une somme fixe, un jour du mois, un fonds choisi.")}</small>
            </span>
            <i aria-hidden="true">›</i>
          </Link>
        </div>
      </Sheet>
    </>
  );
}
