"use client";

import { useCallback, useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import styles from "./Poignee.module.css";

/**
 * Une poignée qui règle la largeur d'un volet.
 *
 * Trois volets tiennent l'écran de relecture : la liste des séances, le
 * communiqué, les champs. Leurs largeurs ne se décident pas ici : elles
 * dépendent du scan qu'on est en train de lire, et un scan tchadien de travers
 * ne demande pas la même place qu'un communiqué gabonais bien cadré. La
 * maquette n'a donc pas à trancher, et le desk tire.
 *
 * La poignée ne tient aucun état React : elle écrit une variable CSS sur son
 * parent, qui est la grille. C'est plus simple qu'un état à synchroniser, et
 * cela évite qu'un rendu du formulaire, qui arrive à chaque frappe, repasse par
 * une largeur de départ pendant qu'on est en train de tirer.
 *
 * La largeur se retient par navigateur. Elle n'a pas à voyager : ce n'est pas
 * une donnée de la maison, c'est un réglage de siège, et il dépend de l'écran
 * qu'on a devant soi. Les lectures de « localStorage » sont gardées : en
 * navigation privée elles jettent, et un volet qui ne se règle plus vaut mieux
 * qu'une page blanche.
 */
export function Poignee({
  variable,
  min,
  max,
  memoire,
  depuisLaDroite = false,
  porte,
  libelle,
}: {
  /** La variable CSS que la grille lit, « --liste » par exemple. */
  variable: string;
  min: number;
  max: number;
  /** La clef de rangement, propre à ce volet. */
  memoire: string;
  /** Le volet est à droite de la poignée : sa largeur se mesure depuis le bord droit. */
  depuisLaDroite?: boolean;
  /**
   * L'ancêtre qui portera la variable, quand ce n'est pas le parent.
   *
   * Une poignée vit parfois dans une rangée qui se répète, alors que la largeur
   * qu'elle règle vaut pour toute la page. Elle écrit alors plus haut, et les
   * variables CSS héritant, toutes les rangées suivent d'un coup. La géométrie
   * reste locale : on mesure sur la rangée qu'on tire.
   */
  porte?: string;
  libelle: string;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  /** Où la variable se pose : l'ancêtre visé, sinon le parent. */
  const cible = useCallback(() => (porte ? ref.current?.closest<HTMLElement>(porte) : ref.current?.parentElement) ?? null, [porte]);

  const poser = useCallback(
    (px: number) => {
      const grille = cible();
      if (!grille) return;
      const v = Math.round(Math.min(max, Math.max(min, px)));
      grille.style.setProperty(variable, `${v}px`);
      try {
        localStorage.setItem(memoire, String(v));
      } catch {
        // navigation privée, stockage refusé : la largeur vaut pour cette visite
      }
    },
    [variable, min, max, memoire, cible],
  );

  // Au montage seulement : la largeur retenue s'applique avant le premier
  // regard, sans passer par un état qui referait rendre le volet.
  useEffect(() => {
    try {
      const s = localStorage.getItem(memoire);
      if (s && Number.isFinite(Number(s))) cible()?.style.setProperty(variable, `${Number(s)}px`);
    } catch {
      // idem
    }
  }, [variable, memoire, cible]);

  const largeur = (clientX: number) => {
    const grille = ref.current?.parentElement?.getBoundingClientRect();
    if (!grille) return min;
    return depuisLaDroite ? grille.right - clientX : clientX - grille.left;
  };

  return (
    <div
      ref={ref}
      className={styles.poignee}
      role="separator"
      aria-orientation="vertical"
      aria-label={t(libelle)}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.tire = "1";
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.dataset.tire !== "1") return;
        poser(largeur(e.clientX));
      }}
      onPointerUp={(e) => {
        delete e.currentTarget.dataset.tire;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onKeyDown={(e) => {
        // Au clavier aussi : une poignée qu'on ne peut que tirer à la souris
        // n'est pas une commande, c'est un ornement.
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const grille = cible();
        const actuel = parseInt(grille?.style.getPropertyValue(variable) || "", 10);
        const base = Number.isFinite(actuel) ? actuel : (min + max) / 2;
        const pas = e.key === "ArrowRight" ? 16 : -16;
        poser(base + (depuisLaDroite ? -pas : pas));
      }}
    />
  );
}
