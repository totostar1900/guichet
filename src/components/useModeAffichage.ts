"use client";

import { useSyncExternalStore } from "react";

/**
 * L'APP EST-ELLE INSTALLÉE, ET PEUT-ELLE PARTAGER ?
 *
 * Installée, elle tourne en « standalone » (manifest.ts) : ni barre d'adresse,
 * ni onglets, donc rien pour revenir d'une page ouverte à côté. Tout lien en
 * « target=_blank » y est un aller simple, et c'est ce qui a fait disparaître
 * l'app trois fois le 8 octobre 2026 : un PDF ouvert à part, puis le
 * « Plein écran » de la visionneuse, qui est le même piège sous un autre nom.
 *
 * La lecture vit ici parce qu'elle est lue à deux endroits au moins, et qu'une
 * règle d'évasion copiée est une règle qu'on oubliera quelque part.
 *
 * Une chaîne et non un objet : « useSyncExternalStore » compare les instantanés
 * par identité, et un objet neuf à chaque lecture bouclerait. Le serveur rend
 * « inconnu », le navigateur tranche après l'hydratation, sans désaccord.
 */
export type ModeAffichage = "inconnu" | "navigateur" | "installee" | "installee-partage";

const lire = (): ModeAffichage => {
  try {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const installee = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (!installee) return "navigateur";
    return typeof navigator.share === "function" ? "installee-partage" : "installee";
  } catch {
    return "navigateur";
  }
};

const sAbonner = (cb: () => void) => {
  try {
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  } catch {
    return () => {};
  }
};

export const useModeAffichage = (): ModeAffichage => useSyncExternalStore(sAbonner, lire, () => "inconnu" as ModeAffichage);

/** Vrai dès qu'on sait que l'app est installée : aucune fenêtre à part, donc aucune sortie. */
export const sansFenetreAPart = (m: ModeAffichage): boolean => m === "installee" || m === "installee-partage";
