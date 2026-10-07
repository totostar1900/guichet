"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./AideReglage.module.css";

/**
 * LE « ? » D'UN RÉGLAGE : ce qu'il change, ouvert à sa place.
 *
 * Il était un <details> nu, et deux défauts en sont sortis à l'usage.
 *
 * IL NE SE FERMAIT QUE PAR SON PROPRE BOUTON. Un <details> natif ignore le
 * clic ailleurs : on ouvrait une bulle, on allait régler autre chose, et elle
 * restait posée sur la commande suivante. Tout ce qui s'ouvre dans cette
 * maison se ferme d'un clic dehors, d'Échap, ou en ouvrant le suivant ; celui
 * du graphique n'avait pas de raison d'y échapper.
 *
 * ET IL SORTAIT DE L'ÉCRAN. La bulle était accrochée au bord gauche de son
 * bouton, ce qui va pour les premiers réglages et déborde pour les derniers :
 * mesuré sur « une séance compte pour moitié après », troisième d'une rangée
 * de huit. La retourner vers la gauche suffit sur un écran large et ne suffit
 * pas sur un téléphone, où elle ressort alors de l'autre bord : mesuré à
 * 375 px, un bord gauche à moins cent soixante-cinq. On ne la retourne donc
 * pas, ON LA BORNE : elle part du bouton, et se décale juste assez pour tenir
 * entre les deux bords, ce qui couvre les deux cas d'un seul calcul.
 */
const MARGE = 8;

export function AideReglage({ texte }: { texte: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [decalage, setDecalage] = useState(0);
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    /* On mesure APRÈS l'ouverture : une bulle non rendue n'a pas de largeur,
       et la déplacer à l'aveugle la ferait sortir de l'autre côté. */
    const bulle = boite.current?.querySelector("p");
    const ancre = boite.current?.getBoundingClientRect();
    if (bulle && ancre) {
      const l = bulle.getBoundingClientRect().width;
      const voulu = Math.max(MARGE, Math.min(ancre.left, window.innerWidth - MARGE - l));
      setDecalage(Math.round(voulu - ancre.left));
    }
    const dehors = (e: Event) => {
      const el = boite.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setOuvert(false);
    };
    const parEchap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("pointerdown", dehors, true);
    document.addEventListener("keydown", parEchap);
    return () => {
      document.removeEventListener("pointerdown", dehors, true);
      document.removeEventListener("keydown", parEchap);
    };
  }, [ouvert]);

  return (
    <div className={styles.aide} ref={boite}>
      <button
        type="button"
        className={styles.bouton}
        aria-expanded={ouvert}
        aria-label={t("Ce que ce réglage change")}
        title={t("Ce que ce réglage change")}
        onClick={() => {
          setDecalage(0);
          setOuvert((v) => !v);
        }}
      >
        ?
      </button>
      {ouvert && (
        <p className={styles.bulle} style={decalage ? { left: `${decalage}px` } : undefined}>
          {texte}
        </p>
      )}
    </div>
  );
}
