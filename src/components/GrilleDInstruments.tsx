"use client";

import { forwardRef } from "react";
import { useT } from "@/i18n/client";
import { IconeDeSection, type NomIcone } from "./IconeDeSection";
import styles from "./GrilleDInstruments.module.css";

export interface TuileDInstrument {
  cle: string;
  icone: NomIcone;
  /** Le mot sous l'icône. */
  nom: string;
  /** Ce que dit un lecteur d'écran : le nom et le nombre de lignes. */
  accessible: string;
  on: boolean;
  /** Éteinte, jamais cachée : sans nombre sur la tuile, c'est l'éclat qui dit l'absence. */
  vide?: boolean;
  onClick: () => void;
}

/**
 * LA GRILLE DES INSTRUMENTS, ÉCRITE UNE FOIS POUR LES TROIS PAGES (4 novembre 2026).
 *
 * Titres (sections de la cote), Fonds (catégories) et Adjudications (compartiments) ont la même forme : trois colonnes fixes
 * sur téléphone, un carré arrondi par instrument avec son icône, son nom dessous, et PAS de nombre de lignes sur la tuile.
 * Choisi sur la planche du 4 novembre (option C) : rien n'est caché hors de l'écran par un défilement latéral.
 */
export const GrilleDInstruments = forwardRef<HTMLDivElement, { items: TuileDInstrument[]; etiquette: string; coach?: string }>(function GrilleDInstruments({ items, etiquette, coach }, ref) {
  const t = useT();
  return (
    /* QUATRE TUILES OU MOINS TIENNENT CÔTE À CÔTE (4 novembre 2026) : les adjudications en ont quatre (Tout, Obligations, Bons, Rachats), et la
       troisième colonne laissait « Rachats » seul sur une deuxième rangée. Au-delà, trois colonnes : six tuiles font deux rangées pleines. */
    <div ref={ref} className={styles.grille} data-serre={items.length >= 6 ? "oui" : undefined} style={{ ["--colonnes" as string]: items.length <= 6 ? Math.max(items.length, 1) : 3 }} role="group" aria-label={t(etiquette)} data-coach={coach}>
      {items.map((x) => (
        <button key={x.cle} type="button" data-section={x.cle} className={`${styles.tuile} ${x.on ? styles.on : ""} ${x.vide ? styles.empty : ""}`.trim()} aria-pressed={x.on} aria-label={x.accessible} onClick={x.onClick} disabled={x.vide}>
          <i>
            <IconeDeSection section={x.icone} taille={22} />
          </i>
          <span>{x.nom}</span>
        </button>
      ))}
    </div>
  );
});
