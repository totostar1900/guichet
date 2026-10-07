"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";
import styles from "./AideReglage.module.css";

/**
 * LE « ? » D'UN RÉGLAGE : ce qu'il change, ouvert à sa place.
 *
 * Trois défauts l'ont façonné, et le troisième explique les deux premiers.
 *
 * IL NE SE FERMAIT QUE PAR SON PROPRE BOUTON. Un <details> natif ignore le
 * clic ailleurs : on ouvrait une bulle, on allait régler autre chose, et elle
 * restait posée sur la commande suivante.
 *
 * IL SORTAIT DE L'ÉCRAN. Accroché au bord gauche de son bouton, il débordait
 * à droite pour les réglages de droite. Le retourner réglait l'écran large et
 * cassait le téléphone, où il ressortait par l'autre bord ; le borner sur la
 * largeur de la fenêtre a réglé les deux.
 *
 * ET IL ÉTAIT COUPÉ PAR SON PANNEAU, ce que la fenêtre ne pouvait pas dire.
 * « .panel » porte « overflow: hidden », et une bulle en position absolue
 * dedans se fait tailler à son bord, quelle que soit sa place dans la
 * fenêtre : sur un écran large elle disparaissait derrière la colonne de
 * commentaire, qui commence justement là. Aucun calcul de position n'en sort,
 * parce que le problème n'est pas la position mais le cadre. La bulle est
 * donc POSÉE SUR LE CORPS DU DOCUMENT, hors de tout panneau et de tout
 * contexte d'empilement, à des coordonnées de page : elle suit le défilement
 * comme le reste, et plus rien ne la découpe.
 */
const MARGE = 8;

export function AideReglage({ texte }: { texte: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [ou, setOu] = useState<{ gauche: number; haut: number } | null>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const bulle = useRef<HTMLParagraphElement>(null);

  /* On place APRÈS le premier rendu : une bulle non rendue n'a pas de
     largeur, et la poser à l'aveugle la ferait sortir d'un côté ou de
     l'autre. Les coordonnées sont celles de la page, défilement compris. */
  const placer = useCallback(() => {
    const b = bouton.current?.getBoundingClientRect();
    const p = bulle.current?.getBoundingClientRect();
    if (!b || !p) return;
    const gauche = Math.max(MARGE, Math.min(b.left, window.innerWidth - MARGE - p.width));
    setOu({ gauche: Math.round(gauche + window.scrollX), haut: Math.round(b.bottom + 6 + window.scrollY) });
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    placer();
    const dehors = (e: Event) => {
      const n = e.target;
      if (!(n instanceof Node)) return;
      if (bouton.current?.contains(n) || bulle.current?.contains(n)) return;
      setOuvert(false);
    };
    const parEchap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("pointerdown", dehors, true);
    document.addEventListener("keydown", parEchap);
    window.addEventListener("resize", placer);
    return () => {
      document.removeEventListener("pointerdown", dehors, true);
      document.removeEventListener("keydown", parEchap);
      window.removeEventListener("resize", placer);
    };
  }, [ouvert, placer]);

  return (
    <div className={styles.aide}>
      <button
        ref={bouton}
        type="button"
        className={styles.bouton}
        aria-expanded={ouvert}
        aria-label={t("Ce que ce réglage change")}
        title={t("Ce que ce réglage change")}
        onClick={() => {
          setOu(null);
          setOuvert((v) => !v);
        }}
      >
        ?
      </button>
      {ouvert &&
        typeof document !== "undefined" &&
        createPortal(
          <p
            ref={bulle}
            className={styles.bulle}
            /* Tant qu'on ne l'a pas mesurée, elle est posée mais invisible :
               un saut d'un coin de l'écran à sa place se verrait. */
            style={ou ? { left: `${ou.gauche}px`, top: `${ou.haut}px` } : { left: 0, top: 0, visibility: "hidden" }}
          >
            {texte}
          </p>,
          document.body,
        )}
    </div>
  );
}
