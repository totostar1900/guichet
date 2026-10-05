"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { FUND_CATEGORY_LABEL } from "@/lib/domain/market";
import styles from "./FondsEnBref.module.css";

/**
 * CE QUE LA PAGE DISAIT EN HAUT, ET QU'ELLE DIT MAINTENANT SUR DEMANDE.
 *
 * Elle ouvrait sur deux blocs de prose : un chapô de trois phrases sur ce
 * qu'est un OPCVM agréé, et un bandeau de quatre cartes expliquant les quatre
 * catégories. Ensemble, près de deux cents mots avant le premier fonds, lus
 * une fois et relus à chaque visite. Ce n'est pas qu'ils étaient faux, c'est
 * qu'ils étaient permanents.
 *
 * Ils tiennent donc dans une feuille qu'on ouvre d'un bouton, à côté du
 * titre : le lecteur qui sait descend directement, celui qui découvre y
 * trouve la même chose, en entier, avec le compte de chaque catégorie et le
 * renvoi à l'éclairage. La feuille est celle de la maison — verrou de
 * défilement, tiré pour fermer, même allure que les autres.
 *
 * Les catégories ne filtrent plus depuis ici : le filtre a sa place, en haut
 * de la liste, et une même action à deux endroits est une action de trop.
 */
export function FondsEnBref() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const cats = ["M", "O", "D", "A"] as const;
  return (
    <>
      <button type="button" className={styles.bouton} onClick={() => setOpen(true)} aria-haspopup="dialog" data-coach="fonds-enbref">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 7.6v.9" />
        </svg>
        {t("En bref")}
      </button>
      {/* LA FEUILLE S'OUVRE DU BORD DE SON DÉCLENCHEUR, règle de la maison.
          Le bouton est passé au coin haut droit, en face du titre : la
          feuille vient de ce coin-là et non du bas de l'écran. */}
      <Sheet open={open} onClose={() => setOpen(false)} title={t("Les fonds en bref")} dock="top-right">
        <div className={styles.corps}>
          <p>
            {t("Un OPCVM met en commun l'argent de plusieurs porteurs et le place selon une règle écrite. Ceux-ci sont agréés par la COSUMAF et leur valeur liquidative paraît au Bulletin Officiel de la Cote, avec leur société de gestion et leur dépositaire.")}
          </p>
          <p>
            {t("Certains sont ouverts à la souscription chez Purpose Capital ; pour les autres, dites-nous votre intérêt : nous organisons la relation avec la société de gestion.")}{" "}
            {t("Les parts sont toujours inscrites à votre nom chez le dépositaire.")}
          </p>
          <h3 className={styles.titre}>{t("Quatre catégories, du plus calme au plus mobile")}</h3>
          <dl className={styles.cats}>
            {cats.map((c) => (
              <div key={c}>
                <dt>
                  <i className={styles.pastille} data-cat={c} aria-hidden="true" />
                  {t(FUND_CATEGORY_LABEL[c])}
                </dt>
                <dd>{t(BREF[c])}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.sortie}>
            <Link href="/info/fonds-vl">{t("Éclairage : la VL et les frais")} →</Link>
          </p>
        </div>
      </Sheet>
    </>
  );
}

/** Une phrase par catégorie : ce qu'elle contient, et ce qu'elle fait au risque. */
const BREF: Record<"M" | "O" | "D" | "A", string> = {
  M: "Placement de trésorerie : titres courts, valeur liquidative très régulière, argent disponible sous quelques jours.",
  O: "Investis en obligations d'États et d'entreprises de la zone ; rendement porté par les coupons, sensibilité aux taux.",
  D: "Un panachage d'obligations, d'actions et de trésorerie, arbitré par la société de gestion.",
  A: "Exposés aux actions cotées à la BVMAC et à la région : le potentiel et la volatilité les plus élevés.",
};
