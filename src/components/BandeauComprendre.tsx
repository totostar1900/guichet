"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { LireUneCarte } from "./LireUneCarte";
import styles from "./BandeauComprendre.module.css";

const CLEF = "guichet:comprendre-ferme";

/**
 * « NOUVEAU SUR INVESTIR ? » (28 novembre 2026, le client : « B » : le bandeau mène à une page de l'application). Sur Investir et sur l'Accueil, un seul bandeau, qui se ferme pour de bon.
 *
 * Il mène à la page « Comprendre l'investissement » (la présentation, condensée) et ouvre la carte annotée. Fermé, il se tait ; l'appareil le sait, le serveur non : il se décide donc dans le
 * navigateur, et ne paraît qu'une fois la lecture faite (aucun saut de mise en page au chargement : il apparaît à la place où il n'y avait rien).
 */
/* L'état est celui de l'appareil : lu du stockage, avec un repli en mémoire quand le stockage est refusé. Côté serveur, le bandeau est « fermé » : il paraît après l'hydratation, sans rien décaler. */
const ecouteurs = new Set<() => void>();
let fermeEnMemoire = false;
const abonner = (f: () => void) => {
  ecouteurs.add(f);
  return () => {
    ecouteurs.delete(f);
  };
};
const lire = (): boolean => {
  if (fermeEnMemoire) return true;
  try {
    return window.localStorage.getItem(CLEF) === "1";
  } catch {
    return false;
  }
};

export function BandeauComprendre() {
  const t = useT();
  const ferme = useSyncExternalStore(abonner, lire, () => true);
  if (ferme) return null;
  const fermer = () => {
    fermeEnMemoire = true;
    try {
      window.localStorage.setItem(CLEF, "1");
    } catch {
      /* sans stockage, il revient à la prochaine visite : rien d'autre à faire */
    }
    ecouteurs.forEach((f) => f());
  };
  return (
    <aside className={styles.bandeau} aria-label={t("Nouveau sur Investir ?")}>
      <div className={styles.texte}>
        <b>{t("Nouveau sur Investir ?")}</b>
        <span>{t("Deux minutes pour comprendre ce que vous achetez et comment lire une carte.")}</span>
      </div>
      <div className={styles.actions}>
        <Link className="btn sm" href="/info/investir">
          {t("Comprendre l'investissement")}
        </Link>
        <LireUneCarte className="btn sm" />
      </div>
      <button type="button" className={styles.fermer} onClick={fermer} aria-label={t("Fermer")}>
        ×
      </button>
    </aside>
  );
}
