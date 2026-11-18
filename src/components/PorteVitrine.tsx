"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { estPublic } from "@/lib/porte";
import { LangSwitch } from "./LangSwitch";
import styles from "./PorteVitrine.module.css";

/**
 * LES DEUX PORTES, EN HAUT À DROITE, SUR CHAQUE PAGE.
 *
 * L'accueil appelait à ouvrir un compte trois fois, et chaque fois DANS le
 * flux de la page : l'appel partait avec le défilement. « Se connecter »
 * vivait de son côté dans la barre du haut : la paire ne se lisait jamais
 * ensemble.
 *
 * ELLE A D'ABORD ÉTÉ UNE BANDE AU BAS DE LA FENÊTRE, et le coin haut-droit
 * l'a remplacée le 22 octobre 2026 : c'est là qu'un lecteur cherche de quoi
 * entrer, sur tous les sites qu'il connaît, et une bande en bas disputait la
 * place au pied réglementaire.
 *
 * ELLE EST FIXE, ET PORTE SON PROPRE FOND. Le coin haut-droit n'a pas le même
 * dessous selon la largeur : la barre bleue sous 1040 px, la page nue au-delà,
 * puisque le haut y est rendu à la page et que la colonne de gauche
 * s'escamote. Un texte qui hérite du fond serait lisible ici et invisible là ;
 * la pastille tranche en portant le sien, une seule fois, pour les trois mises
 * en page.
 *
 * LE SÉLECTEUR DE LANGUE L'ACCOMPAGNE. Il vivait au pied, dans un « p », où il
 * posait un « form » — du HTML invalide que le navigateur défait au parsing,
 * et donc une erreur d'hydratation à chaque page publique : l'écran montrait
 * une erreur au premier clic, et il fallait recharger. Il est ici, dans un
 * « div », et la faute disparaît avec le déplacement.
 *
 * Elle ne paraît que devant la porte : jamais à qui est entré, jamais sur
 * l'adresse du desk, et pas sur « /connexion », qui EST la porte — le
 * sélecteur de langue, lui, y reste, car on choisit sa langue avant d'entrer.
 */
export function PorteVitrine({ signedIn, deskHost = false }: { signedIn: boolean; deskHost?: boolean }) {
  const t = useT();
  const path = usePathname() || "/";
  if (signedIn || deskHost) return null;
  if (!estPublic(path)) return null;
  /* Sur la porte elle-même, les deux boutons n'ont plus d'objet : le
     formulaire est sous les yeux. La langue, si. */
  const surLaPorte = path.startsWith("/connexion") || path.startsWith("/auth");
  /* On revient où l'on était : la barre du haut l'oubliait et renvoyait tout
     le monde à l'accueil. */
  const suite = path === "/" ? "" : `&next=${encodeURIComponent(path)}`;
  const entrer = path === "/" ? "/connexion" : `/connexion?next=${encodeURIComponent(path)}`;
  return (
    <>
      <div className={styles.coin} role="group" aria-label={t("Ouvrir un compte ou se connecter")}>
        <LangSwitch compact clair />
        {!surLaPorte && (
          <>
            {/* AU LARGE, LES DEUX PORTES RESTENT DANS LA PASTILLE DU HAUT. Sous 761 px elles passent dans la bande basse (ci-dessous) et la pastille ne garde que la langue : à 390 px, « Ouvrir un compte » et « Se connecter » faisaient 255 px à eux deux et recouvraient l'enseigne. Le libellé entier reste dans « aria-label ». */}
            <Link className={`btn primary ${styles.porte} ${styles.auLarge}`} href={`/connexion?creer=1${suite}`} aria-label={t("Ouvrir un compte")}>
              <span className={styles.long}>{t("Ouvrir un compte")}</span>
              <span className={styles.court}>{t("Ouvrir")}</span>
            </Link>
            <Link className={`btn ${styles.porte} ${styles.second} ${styles.auLarge}`} href={entrer} aria-label={t("Se connecter")}>
              <span className={styles.long}>{t("Se connecter")}</span>
              <span className={styles.court}>{t("Entrer")}</span>
            </Link>
          </>
        )}
      </div>
      {/* LA BANDE BASSE (18 novembre 2026, planche « Accueil en quatre écrans », 3A) : « Créer mon compte » et « Se connecter », collés en bas au pouce, sur chaque page publique. Elle n'existe que sur téléphone ; elle remplace les boutons de la pastille du haut, qui garde la langue. Le pied de la page réserve sa hauteur (« globals.css », body:has). La transition de page dit « on avance » vers la porte. */}
      {!surLaPorte && (
        <nav className={styles.bande} data-bande-entree="" aria-label={t("Ouvrir un compte ou se connecter")}>
          <Link className={styles.creer} href={`/connexion?creer=1${suite}`} transitionTypes={["nav-avant"]}>
            {t("Créer mon compte")}
          </Link>
          <Link className={styles.entrer} href={entrer} transitionTypes={["nav-avant"]}>
            {t("Se connecter")}
          </Link>
        </nav>
      )}
    </>
  );
}
