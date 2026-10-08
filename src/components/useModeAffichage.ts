"use client";

import { useSyncExternalStore } from "react";

/**
 * OÙ L'APP TOURNE, ET CE QUE L'APPAREIL SAIT FAIRE.
 *
 * Installée, elle tourne en « standalone » (manifest.ts) : ni barre d'adresse,
 * ni onglets, donc rien pour revenir d'une page ouverte à côté. Tout lien en
 * « target=_blank » y est un aller simple, et c'est ce qui a fait disparaître
 * l'app trois fois le 8 octobre 2026 : un PDF ouvert à part, puis le
 * « Plein écran » de la visionneuse, puis le lien de sa branche d'échec.
 *
 * ET LES DEUX SYSTÈMES NE SE VALENT PAS. Sur Android, un téléchargement
 * descend et l'appareil le signale. Sur iOS, dans une app ajoutée à l'écran
 * d'accueil, « a download » ne fait RIEN : aucun fichier, aucune notification,
 * aucune erreur. C'est la cause du téléchargement muet signalé le 8 octobre.
 * Le seul chemin qui y pose un fichier est la feuille de partage, dont la
 * première entrée est « Enregistrer dans Fichiers ».
 *
 * « navigator.standalone » n'existe que sur Safari, et n'y vaut vrai que dans
 * une app de l'écran d'accueil : c'est exactement la question posée, et non une
 * reniflade d'agent.
 *
 * Une chaîne et non un objet : « useSyncExternalStore » compare les instantanés
 * par identité, et un objet neuf à chaque lecture bouclerait. Le serveur rend
 * « inconnu », le navigateur tranche après l'hydratation, sans désaccord.
 */
export type ModeAffichage = "inconnu" | "navigateur" | "installee" | "installee-ios";

const lire = (): ModeAffichage => {
  try {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return "installee-ios";
    return window.matchMedia("(display-mode: standalone)").matches ? "installee" : "navigateur";
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

/** Aucune fenêtre où sortir : ne proposer aucun lien qui quitte la page. */
export const sansFenetreAPart = (m: ModeAffichage): boolean => m === "installee" || m === "installee-ios";

/** Un téléchargement y descend vraiment, et l'appareil le signale. Faux dans une app iOS. */
export const telechargementFiable = (m: ModeAffichage): boolean => m !== "installee-ios";

/** L'appareil sait recevoir un fichier par la feuille de partage du système. */
export const saitPartagerUnFichier = (): boolean => {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([], "x.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
};
