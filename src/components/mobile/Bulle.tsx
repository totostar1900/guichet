"use client";

import { useSyncExternalStore } from "react";
import { Sheet } from "./Sheet";

/**
 * LA CONFIRMATION, UNE SEULE, AU MILIEU DE L'ÉCRAN, ET ELLE SURVIT À SA PAGE (7 puis 8 novembre 2026).
 *
 * Le menu « ··· » posait la sienne en bas de l'écran, le glissement dans la carte, l'étoile de la fiche n'en posait aucune : trois façons de dire « c'est
 * fait » pour le même geste. Une seule maintenant. ELLE EST AU MILIEU DE L'ÉCRAN comme toute bulle d'information (skill guichet-espace-tuiles, « Les bulles
 * d'information ») : la fenêtre centrée de la maison, fermée d'un geste du doigt (tirer vers le bas), par la croix ou en touchant à côté ; sans geste, elle se
 * referme d'elle-même au bout de trois secondes. Le titre est ce qui précède « : » (« Alerte armée »), le détail ce qui suit.
 *
 * ELLE VIT HORS DES COMPOSANTS QUI LA DISENT. Sur les pages Suivies et Favoris, retirer une ligne la fait disparaître de la liste : le bouton qui venait de
 * parler était démonté avec elle, et la bulle partait avec lui avant d'être lue (mesuré : rien à l'écran 800 ms après le geste). L'état est donc un magasin
 * de module, et « HoteDeLaBulle » (posé une fois dans la mise en page) l'affiche, quelle que soit la page qui l'a demandée.
 */
let texte = "";
/* Le dernier texte reste le temps que la fenêtre se referme : sans lui, son titre se viderait pendant l'animation de sortie. */
let dernier = "";
let minuterie: number | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());
const DUREE = 3000;

export function dire(t: string) {
  texte = t;
  dernier = t;
  if (minuterie) window.clearTimeout(minuterie);
  minuterie = window.setTimeout(fermer, DUREE);
  prevenir();
}

function fermer() {
  if (minuterie) window.clearTimeout(minuterie);
  minuterie = null;
  texte = "";
  prevenir();
}

/** De quoi dire une confirmation. */
export function useBulle(): { dire: (texte: string) => void } {
  return { dire };
}

/** Posé une fois dans la mise en page : affiche la confirmation en cours. */
export function HoteDeLaBulle() {
  const abonner = (f: () => void) => {
    abonnes.add(f);
    return () => abonnes.delete(f);
  };
  const t = useSyncExternalStore(abonner, () => texte, () => "");
  const vu = useSyncExternalStore(abonner, () => dernier, () => "");
  const [titre, ...reste] = vu.split(" : ");
  return (
    <Sheet open={Boolean(t)} onClose={fermer} title={titre} centre>
      {reste.length > 0 && <p style={{ margin: 0, lineHeight: 1.55 }}>{reste.join(" : ")}</p>}
    </Sheet>
  );
}

type Dire = (cle: string) => string;

/** Ce que la maison dit quand un suivi change : armé (une fois par jour à l'adjudication, à chaque mouvement sur la cote) ou retiré. */
export function texteDuSuivi(watching: boolean, cadence: "evenement" | "quotidien" | undefined, t: Dire): string {
  if (!watching) return t("Alerte retirée");
  return cadence === "quotidien" ? t("Alerte armée : un message par jour jusqu'à la clôture") : t("Ligne suivie : un message à chaque mouvement");
}
