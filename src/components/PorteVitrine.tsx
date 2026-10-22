"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { estPublic } from "@/lib/porte";
import styles from "./PorteVitrine.module.css";

/**
 * LES DEUX PORTES, TOUJOURS SOUS LES YEUX.
 *
 * L'accueil appelait à ouvrir un compte trois fois, et chaque fois DANS le
 * flux de la page : l'appel partait avec le défilement, et le visiteur qui
 * avait lu jusqu'en bas n'avait plus rien sous la main. « Se connecter »
 * vivait de son côté dans la barre du haut, c'est-à-dire ailleurs : la paire
 * ne se lisait jamais ensemble.
 *
 * ELLE EST EN BAS, ET FIXE, parce que c'est le seul endroit qui tienne aux
 * trois mises en page. La barre du haut n'existe plus au-delà de 1040 px, et
 * la colonne de gauche s'escamote — d'un geste du lecteur, et d'office sur
 * les routes larges : son pied ne peut donc rien garantir. Sous 760 px la
 * bande prend la place que le dock laisse libre, car le dock ne paraît qu'à
 * qui est entré et ses 76 px étaient réservés pour personne.
 *
 * LES DEUX NE PÈSENT PAS PAREIL : ouvrir un compte est l'invitation, se
 * connecter la porte de service de qui a déjà un compte. Le libellé dit
 * « Ouvrir un compte » et mène à la porte la moins chère, celle qui ne
 * demande aucune pièce ; le dossier d'ouverture, lui, vit derrière la
 * connexion et ne s'adresse qu'à un client entré. Les deux mots ne paraissent
 * donc jamais au même lecteur.
 *
 * Elle ne paraît que devant la porte : jamais à qui est entré, jamais sur
 * l'adresse du desk, et pas sur la page de connexion, qui EST la porte.
 */
export function PorteVitrine({ signedIn, deskHost = false }: { signedIn: boolean; deskHost?: boolean }) {
  const t = useT();
  const path = usePathname() || "/";
  if (signedIn || deskHost) return null;
  if (path.startsWith("/connexion") || path.startsWith("/auth")) return null;
  /* La liste blanche de porte.ts tranche : hors d'elle, un visiteur est de
     toute façon renvoyé à la connexion par le proxy, et la bande n'a pas de
     lecteur. */
  if (!estPublic(path)) return null;
  /* On revient où l'on était : la barre du téléphone le faisait déjà, la
     barre du haut l'avait oublié et renvoyait tout le monde à l'accueil. */
  const suite = path === "/" ? "" : `&next=${encodeURIComponent(path)}`;
  const entrer = path === "/" ? "/connexion" : `/connexion?next=${encodeURIComponent(path)}`;
  return (
    <>
      <aside className={styles.bande} aria-label={t("Ouvrir un compte ou se connecter")}>
        <div className={styles.dedans}>
          {/* La phrase ôte la peur du geste, et ne paraît qu'où il y a la
              place : sous le pouce, les deux boutons prennent la largeur. */}
          <p className={styles.mot}>{t("Créer votre compte ne vous engage à rien et ne demande aucun document.")}</p>
          <Link className={`btn primary ${styles.porte}`} href={`/connexion?creer=1${suite}`}>
            {t("Ouvrir un compte")}
          </Link>
          <Link className={`btn ghost ${styles.porte}`} href={entrer}>
            {t("Se connecter")}
          </Link>
        </div>
      </aside>
      {/* LA PLACE DE LA BANDE, RENDUE AU DOCUMENT. Fixée au bas de la fenêtre,
          elle couvrirait les dernières lignes du pied réglementaire — l'agrément
          et le risque de perte en capital, qui sont précisément ce qu'on ne
          masque pas. Cet espaceur est le dernier élément de la page, donc la
          bande ne couvre plus que lui. Sous 760 px il s'efface : les 76 px du
          dock sont déjà réservés par la mise en page. */}
      <div className={styles.place} aria-hidden="true" />
    </>
  );
}
