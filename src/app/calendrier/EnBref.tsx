"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { BEAC_ANNONCES } from "@/lib/market/beac";
import styles from "@/app/fonds/FondsEnBref.module.css";

/**
 * CE QUE LA PAGE DISAIT EN HAUT, ET QU'ELLE DIT MAINTENANT SUR DEMANDE.
 *
 * Elle ouvrait sur deux phrases de chapô, relues à chaque visite par un
 * lecteur qui vient voir des séances. Même règle que sur les fonds : ce qui
 * est permanent passe derrière un bouton, à côté du titre, et la liste
 * commence tout de suite.
 *
 * Elle y gagne ce qu'elle n'avait pas : LE DÉROULÉ. Une adjudication est une
 * suite de dates, et personne n'avait écrit laquelle fait quoi. Et surtout,
 * CE QUE LE PRIX VEUT DIRE : à l'adjudication on ne paie pas un cours, on
 * propose un prix, et celui que nous affichons est une proposition du desk,
 * pas une condition. Un client qui l'ignore croit la ligne à prendre ou à
 * laisser ; il peut en dire un autre, et c'est le sien qui part.
 *
 * LE LIEN VERS LES ANNONCES DE LA BEAC EST ICI, et c'est voulu. La page
 * citait le communiqué de chaque séance dans deux blocs qui ont été retirés ;
 * la source ne doit pas partir avec eux. « Rien n'y est de nous » reste vrai
 * tant que la porte du communiqué est ouverte quelque part.
 */
export function AdjudicationsEnBref() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.bouton} onClick={() => setOpen(true)} aria-haspopup="dialog" data-coach="adjudications-enbref">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 7.6v.9" />
        </svg>
        {t("En bref")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("Les adjudications en bref")} dock="top-right">
        <div className={styles.corps}>
          <p>
            {t("Les six Trésors de la CEMAC empruntent par adjudication : ils annoncent une séance, les investisseurs y proposent un prix ou un taux, et le Trésor sert les meilleures offres jusqu'au montant qu'il recherche. Les annonces viennent de la BEAC, et c'est elle qui fait foi.")}
          </p>
          <h3 className={styles.titre}>{t("Comment une séance se déroule")}</h3>
          <dl className={styles.cats}>
            {ETAPES.map(([quand, quoi]) => (
              <div key={quand}>
                <dt>{t(quand)}</dt>
                <dd>{t(quoi)}</dd>
              </div>
            ))}
          </dl>
          <h3 className={styles.titre}>{t("Le prix que vous voyez est une proposition")}</h3>
          <p>
            {t("Le prix, ou le taux, que porte une ligne est celui que Purpose Capital compte présenter à la séance : le desk l'établit au vu des séances précédentes du même Trésor. Ce n'est pas une condition.")}
          </p>
          <p>
            {t("Vous pouvez proposer le vôtre. Dites-le au desk avant la clôture et c'est celui-là qui part à la séance ; un prix plus bas rapporte davantage s'il est servi, et risque de ne pas l'être.")}
          </p>
          <p className={styles.sortie}>
            <a href={BEAC_ANNONCES} target="_blank" rel="noreferrer">
              {t("Les annonces de la BEAC")} →
            </a>
          </p>
        </div>
      </Sheet>
    </>
  );
}

/** Le déroulé d'une séance, dans l'ordre : quatre moments, une phrase chacun. */
const ETAPES: [string, string][] = [
  ["L'annonce", "Le Trésor publie son communiqué, en général une semaine avant la séance : montant recherché, durée, date de règlement."],
  ["La clôture", "Le desk doit avoir votre ordre avant elle. Elle précède la séance, parfois de la veille seulement."],
  ["La séance", "Les offres sont dépouillées le jour dit. Le Trésor retient les meilleures jusqu'au montant qu'il veut lever, et peut servir moins, ou rien."],
  ["Le règlement", "Les titres servis sont inscrits à votre nom chez le dépositaire central, et le montant est prélevé à la date de valeur annoncée."],
];
