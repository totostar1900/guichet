"use client";

import { useRef } from "react";
import { useT } from "@/i18n/client";

/**
 * La poignée qui étire le rail par son bord.
 *
 * POURQUOI ELLE EXISTE. `resize: both` donne un coin, en bas à droite, et il
 * faut aller le chercher. Le geste attendu d'une liste et d'un panneau est de
 * tirer la SÉPARATION entre les deux, là où l'oeil la voit. Le coin reste pour
 * la hauteur ; la séparation fait la largeur.
 *
 * ELLE SE PREND AU CLAVIER, et c'est la limite que j'avais annoncée en posant
 * `resize`. Les flèches déplacent de seize pixels, Origine et Fin vont aux
 * bornes. Un séparateur qui ne s'atteint qu'à la souris ferme la mise en page à
 * qui navigue au clavier.
 *
 * ELLE N'A PAS D'ÉTAT REACT. La largeur vit sur l'élément, en style, exactement
 * là où la poignée du navigateur l'écrit : GardeTaille.tsx la relit et la garde
 * sans savoir qui l'a posée. Un état ici ferait deux sources pour une seule
 * largeur, et elles divergeraient le jour où l'on tire le coin.
 */
const RAIL = "desk-messages-liste";
const MIN = 200;
const MAX = 720;
const PAS = 16;

export function PoigneeRail() {
  const t = useT();
  const depart = useRef<{ x: number; largeur: number } | null>(null);

  const rail = () => document.getElementById(RAIL);
  const poser = (px: number) => {
    const el = rail();
    if (el) el.style.width = `${Math.min(MAX, Math.max(MIN, Math.round(px)))}px`;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rail();
    if (!el) return;
    depart.current = { x: e.clientX, largeur: el.getBoundingClientRect().width };
    /* La capture garde le geste même si le doigt sort de la poignée, qui ne fait
       que six pixels de large : sans elle, tirer vite lâcherait la barre. */
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!depart.current) return;
    poser(depart.current.largeur + (e.clientX - depart.current.x));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    depart.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = rail();
    if (!el) return;
    const l = el.getBoundingClientRect().width;
    if (e.key === "ArrowLeft") poser(l - PAS);
    else if (e.key === "ArrowRight") poser(l + PAS);
    else if (e.key === "Home") poser(MIN);
    else if (e.key === "End") poser(MAX);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t("Largeur de la liste")}
      tabIndex={0}
      className="poignee-rail"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
    />
  );
}
