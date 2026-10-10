"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import styles from "./Pli.module.css";

/**
 * LE PLI DE LA MAISON, ET SES TROIS FILETS.
 *
 * Partout où l'on empile des listes, il faut trois niveaux de séparation et
 * pas un de plus : une BANDE pleine pour un rayon, un FILET d'or très clair
 * pour un groupe à l'intérieur, un filet nu pour une ligne. Une seconde boîte
 * dans la boîte ferait deux cadres imbriqués, et c'est ce qu'on évite ici.
 *
 * UN PLI NE CACHE JAMAIS UN DEVOIR. La leçon est ancienne dans la maison :
 * « un pli pose au lecteur la question y a-t-il quelque chose là-dedans à
 * chaque ouverture ». La tête porte donc toujours son compte, et une pastille
 * quand ce qu'elle cache attend un geste : replier ne doit jamais faire
 * disparaître un bulletin à signer.
 *
 * LE PLI EST UNE GRILLE, de 1fr à 0fr : aucune hauteur à mesurer, donc rien
 * qui saute quand le contenu change, et l'animation s'arrête d'elle-même sous
 * « prefers-reduced-motion ».
 *
 * L'ÉTAT SE GARDE SUR L'APPAREIL, par clef : on retrouve sa page comme on
 * l'a laissée. Le premier rendu est celui du serveur (`defaut`), et le choix
 * gardé s'applique au montage : sans cela, deux HTML différents, et
 * l'hydratation casse.
 */
const EVT = "guichet:pli";
const clefDe = (cle: string) => `${EVT}:${cle}`;

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVT, cb);
  };
};

const lire = (cle: string): string => {
  try {
    return localStorage.getItem(clefDe(cle)) ?? "";
  } catch {
    // Navigation privée, stockage refusé : le pli vit le temps de la page.
    return "";
  }
};

/** Replier ou déplier d'ailleurs : « Tout replier » s'en sert. */
export function poserLePli(cle: string, ouvert: boolean) {
  try {
    localStorage.setItem(clefDe(cle), ouvert ? "oui" : "non");
  } catch {
    // sans stockage, l'événement suffit pour cette page
  }
  window.dispatchEvent(new Event(EVT));
}

export interface PliProps {
  /** La clef de mémoire : stable, et propre à ce pli. */
  cle: string;
  /** « bande » pour un rayon, « filet » pour un groupe à l'intérieur. */
  niveau?: "bande" | "filet";
  titre: string;
  sous?: string;
  /** Combien il contient, dit même replié : « 4 documents ». */
  compte?: string;
  /** Ce qui attend un geste là-dedans : « 1 à signer ». */
  attend?: string;
  /** L'état de l'opération, pour un groupe. */
  etiquette?: ReactNode;
  defaut?: boolean;
  children: ReactNode;
}

export function Pli({ cle, niveau = "bande", titre, sous, compte, attend, etiquette, defaut = true, children }: PliProps) {
  const t = useT();
  const garde = useSyncExternalStore(
    subscribe,
    () => lire(cle),
    () => "",
  );
  const ouvert = garde ? garde === "oui" : defaut;
  return (
    <section className={niveau === "filet" ? styles.groupe : styles.rayon} data-ouvert={ouvert ? "oui" : "non"}>
      <button type="button" className={niveau === "filet" ? styles.tete : styles.bande} aria-expanded={ouvert} aria-label={`${titre} · ${t(ouvert ? "Replier" : "Déplier")}`} onClick={() => poserLePli(cle, !ouvert)}>
        <span className={styles.nom}>
          <b>{titre}</b>
          {sous && <small>{sous}</small>}
        </span>
        {etiquette}
        {attend && <span className={styles.attend}>{attend}</span>}
        {compte && <span className={styles.compte}>{compte}</span>}
        <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={styles.corps}>
        <div>
          <div className={niveau === "filet" ? styles.retrait : styles.dedans}>{children}</div>
        </div>
      </div>
    </section>
  );
}
