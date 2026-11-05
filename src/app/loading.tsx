"use client";

import { useT } from "@/i18n/client";
import styles from "./loading.module.css";

/**
 * L'ÉCRAN D'ATTENTE DE TOUTES LES PAGES (10 novembre 2026, point 1 de la lenteur).
 *
 * Aucune des cent neuf pages dynamiques n'avait d'écran d'attente : au toucher d'un lien ou d'un siège du menu, rien ne bougeait avant la réponse du serveur (de 0,4 à 0,6 s
 * mesurés sur une page publique légère, davantage avec l'aller-retour depuis l'Afrique centrale), et le client lisait un lien qui ne répond pas. Ce squelette s'affiche À L'INSTANT
 * du toucher, le menu et la bande du haut restent en place et interactifs, et la page vraie le remplace dès qu'elle arrive.
 *
 * Il ne dit rien de la page à venir : un titre, une phrase, trois encadrés en relief, aux jetons de la maison (« pile », « --surface », « --rond »). Il ne porte aucun chiffre.
 * Un texte caché au lecteur d'écran dit « Chargement de la page » ; la pulsation s'arrête pour qui a demandé moins d'animation.
 *
 * Un « loading.tsx » à la racine couvre toute page qui n'a pas le sien. Réserve connue (docs Next, « Status Codes ») : une page qui répond « introuvable » après le début du flux
 * répond 200 avec « noindex » plutôt que 404 ; la maison est derrière une connexion, et le client n'y voit aucune différence.
 */
export default function Loading() {
  const t = useT();
  return (
    <div className={`pile ${styles.attente}`} role="status" aria-busy="true">
      <span className={styles.cache}>{t("Chargement de la page")}</span>
      <div className={styles.entete} aria-hidden="true">
        <span className={styles.titre} />
        <span className={styles.phrase} />
      </div>
      <span className={styles.carte} aria-hidden="true" />
      <span className={styles.carte} aria-hidden="true" />
      <span className={styles.carteBasse} aria-hidden="true" />
    </div>
  );
}
