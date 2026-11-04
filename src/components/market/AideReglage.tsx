"use client";

import { useState } from "react";
import { Sheet } from "@/components/mobile/Sheet";
import { useT } from "@/i18n/client";
import styles from "./AideReglage.module.css";

/**
 * LE « ? » D'UN RÉGLAGE : ce qu'il change, ouvert AU MILIEU DE L'ÉCRAN (8 novembre 2026).
 *
 * C'était une bulle posée sur le corps du document, à des coordonnées de page, qu'il fallait mesurer, borner et refermer par un clic ailleurs : trois
 * défauts successifs (elle ne se fermait que par son bouton, sortait de l'écran, était taillée par son panneau). Une bulle d'information est maintenant
 * la fenêtre centrée de la maison (« Sheet » « centre ») : voile, croix, tiré vers le bas. Plus rien à placer ni à découper.
 */
export function AideReglage({ texte }: { texte: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className={styles.aide}>
      <button type="button" className={styles.bouton} aria-expanded={ouvert} aria-haspopup="dialog" aria-label={t("Ce que ce réglage change")} title={t("Ce que ce réglage change")} onClick={() => setOuvert(true)}>
        ?
      </button>
      <Sheet open={ouvert} onClose={() => setOuvert(false)} title={t("Ce que ce réglage change")} centre>
        <p className={styles.texte}>{texte}</p>
      </Sheet>
    </div>
  );
}
