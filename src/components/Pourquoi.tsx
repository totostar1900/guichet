"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import styles from "./Pourquoi.module.css";

/**
 * LE POINT D'INTERROGATION : CE QU'ON N'A BESOIN DE LIRE QU'UNE FOIS.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ, le 26 octobre 2026 : « moins chargé, plus
 * aéré ; une partie du contenu d'explication pourrait tenir derrière une icône
 * point d'interrogation ».
 *
 * CE QU'IL RÉPARE, ET C'EST MESURABLE. La page du sondage répétait la même
 * phrase de trois lignes sous CHAQUE attente — « votre réponse est au desk,
 * elle ne vous engage à rien… ». Quatre attentes, douze lignes de la même
 * prose, et c'est la troisième fois qu'on la lit avant d'arriver au chiffre
 * qu'on venait voir. Une explication qu'on relit à chaque visite n'est pas une
 * explication, c'est du bruit : elle a été utile une fois.
 *
 * LA RÈGLE QUI DÉCIDE DE CE QUI PASSE DERRIÈRE : ce qui est VRAI EN PERMANENCE
 * et identique d'une ligne à l'autre. Ce qui change d'une ligne à l'autre — un
 * montant, une date, un motif de clôture — reste à l'écran, toujours : derrière
 * le point, il deviendrait introuvable au moment précis où il compte.
 *
 * LA MÊME FEUILLE QUE « EN BREF », et c'est voulu : le lecteur a déjà appris le
 * geste en haut de la page. Deux façons d'ouvrir un texte sur un même écran, ce
 * sont deux choses à apprendre pour un seul service.
 */
export function Pourquoi({ titre, children, petit }: { titre: string; children: ReactNode; petit?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`${styles.point} ${petit ? styles.petit : ""}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        /* LE NOM DIT DE QUOI, et non « aide » : un lecteur d'écran qui annonce
           quatre boutons « aide » sur la même page n'a rien annoncé. */
        aria-label={t("Pourquoi : {q}", { q: t(titre) })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.4 9.2a2.7 2.7 0 1 1 3.3 2.6c-.5.1-.7.5-.7 1v.7" />
          <path d="M12 16.6v.6" />
        </svg>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t(titre)} dock="top-right">
        <div className={styles.corps}>{children}</div>
      </Sheet>
    </>
  );
}
