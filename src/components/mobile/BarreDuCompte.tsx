"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { lireLeBrouillon, poserLeBrouillon, reprendre, SIGNAL } from "@/lib/brouillon";
import { useT } from "@/i18n/client";
import type { Attente } from "@/lib/domain/services";
import { MenuRecherche, useGuideIndex } from "@/components/menu/Pieces";
import { Sheet } from "./Sheet";
import styles from "./BarreDuCompte.module.css";

/**
 * CE QUI RESTE DANS LE COIN : CE QUI ATTEND, LA RECHERCHE, ET L'INITIALE.
 *
 * Ce fichier s'appelait « AccountMenu » et portait une feuille de onze blocs :
 * une recherche, le statut, le nom et la ville, les deux canaux et leur
 * preuve, huit tuiles de destination, les rejouables, le contact, les
 * couleurs, quatre réglages, deux sorties et un pied légal. Inventaire fait le
 * 24 octobre 2026 : SIX de ces onze blocs étaient de la navigation qui avait
 * trouvé sa porte ailleurs dans la semaine, et le pied légal était la
 * troisième copie de celui de la page.
 *
 * LA FEUILLE EST DEVENUE CINQ PAGES — `/moi/compte` et ses rubriques — et
 * l'initiale y mène au lieu d'ouvrir un tiroir. Ce qui se gagne n'est pas
 * seulement de la place : une page a une adresse qu'on envoie, un retour
 * système qui marche, un titre dans l'onglet, et la place d'écrire une phrase
 * entière là où une tuile tenait trois mots.
 *
 * LA RECHERCHE GARDE SA FEUILLE, ET A MAINTENANT UNE PAGE. Une recherche se
 * fait là où l'on est : c'est ce que la feuille sert, et six résultats
 * suffisent à retrouver un mot sans quitter sa page. Ce qu'elle ne peut pas
 * porter — tous les résultats, le type de chacun, la phrase où le mot
 * apparaît, les flèches du clavier, les questions les plus posées — vit à
 * `/recherche`, et un lien au pied de la feuille y mène.
 *
 * DEUX SURFACES POUR UNE RECHERCHE, C'EST UN DE TROP, et c'est assumé le temps
 * de voir laquelle sert : la feuille répond vite, la page répond entièrement.
 * Le jour où l'une des deux ne sert plus, c'est la feuille qui part — la page
 * a une adresse, un retour, et le même champ que le Guide.
 *
 * TROIS CIBLES VOISINES, TROIS DESTINATIONS, AUCUN CHEVAUCHEMENT. La pastille
 * déroule ce qui attend, la loupe ouvre la recherche, l'initiale mène au
 * compte. Le doigt vise mal : rien n'est posé SUR autre chose.
 */
export interface BarreProps {
  name: string;
  /** Le desk n'a pas la loupe du guide : sa console a sa propre recherche. */
  desk: boolean;
  /** Ce qui attend le client, en entier : le panneau de la pastille le déroule. */
  attentes?: Attente[];
}

export function BarreDuCompte(p: BarreProps & { dock?: "top-right" | "bottom-left" }) {
  const t = useT();
  const [cherche, setCherche] = useState(false);
  const chemin = usePathname();
  const { index } = useGuideIndex(cherche);
  const initial = p.name.trim().charAt(0).toUpperCase() || "?";
  const attentes = p.attentes ?? [];
  /* Le panneau et celle des attentes qui est dépliée. Deux états de session :
     ils ne survivent pas à la page, et c'est bien — une décision prise n'a pas
     à rouvrir son tiroir au retour. */
  /**
   * L'ORDRE COMMENCÉ ET NON ENVOYÉ COMPTE PARMI CE QUI ATTEND.
   *
   * Demandé le 28 octobre 2026, « sans date limite ». Il vient de l'appareil
   * et non du serveur — rien n'a été envoyé, le desk n'en sait rien — donc il
   * se lit ici, à côté des attentes qui, elles, viennent du dossier.
   *
   * L'INSTANTANÉ EST LA CHAÎNE BRUTE, et non l'objet : « useSyncExternalStore »
   * compare ce qu'on lui rend, et deux objets égaux ne sont jamais le même ;
   * rendre l'objet ferait une boucle de rendu.
   */
  const brut = useSyncExternalStore(
    (prevenir) => {
      window.addEventListener(SIGNAL, prevenir);
      window.addEventListener("storage", prevenir);
      return () => {
        window.removeEventListener(SIGNAL, prevenir);
        window.removeEventListener("storage", prevenir);
      };
    },
    () => {
      try {
        return localStorage.getItem("guichet:brouillon") ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  const brouillon = useMemo(() => (brut ? lireLeBrouillon() : null), [brut]);
  const combien = attentes.length + (brouillon ? 1 : 0);
  const [alertes, setAlertes] = useState(false);
  const [choisie, setChoisie] = useState<string | null>(attentes[0]?.cle ?? null);

  return (
    <>
      {/* UNE PASTILLE QUI NE MÈNE À RIEN N'EST QU'UN REPROCHE.
          Elle a été posée sur l'initiale, et elle n'y servait qu'à moitié :
          elle disait « une chose vous attend » et ouvrait la feuille du
          compte, où cette chose ne figure pas. Elle est donc un bouton à
          elle, à côté de l'initiale et non dessus, parce que deux cibles qui
          se chevauchent au doigt n'en font qu'une.
          À zéro, rien ne paraît : une pastille qui annonce « rien » apprend à
          l'oeil à ne plus la regarder, y compris le jour où elle dit un.
          ELLE SE DÉROULE AU LIEU D'EMMENER AILLEURS : le lecteur quittait sa
          page AVANT de savoir ce qui l'attendait, et il ne choisissait rien —
          alors que c'est quand il y en a plusieurs qu'il faut choisir laquelle
          traiter. Le panneau les nomme, chacune avec son moment, son chiffre
          et son geste. */}
      {combien > 0 && (
        <div className={styles.cloche}>
          <button
            type="button"
            className={styles.alerte}
            onClick={() => setAlertes(!alertes)}
            aria-expanded={alertes}
            /* « 1 décisions vous attendent » : le pluriel était fixe, et il
               se lit à voix haute par les lecteurs d'écran autant qu'il
               s'affiche en infobulle. */
            aria-label={combien > 1 ? t("{n} décisions vous attendent", { n: String(combien) }) : t("Une décision vous attend")}
            title={combien > 1 ? t("{n} décisions vous attendent", { n: String(combien) }) : t("Une décision vous attend")}
          >
            {/* LA CLOCHE ÉTAIT UN NOM SANS DESSIN.
                Signalé deux fois à l'écran — « je ne vois pas la cloche des
                notifications, la pastille est là sans cloche » — et c'était
                exact : cet élément s'appelle « cloche » dans le code depuis le
                premier jour, mais il ne montrait qu'un chiffre dans un rond
                rouge. Un rond rouge marqué « 2 » à côté de son initiale ne dit
                pas « deux décisions vous attendent » : il dit qu'il y a un
                problème, ou il ne dit rien.
                La cloche porte le sens, le chiffre porte la quantité, et la
                cloche prend l'encre de la barre comme la loupe voisine —
                blanche sur le bleu nuit, sombre au pied de la colonne. */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
              <path d="M10 20h4" />
            </svg>
            <span className={styles.compte}>{combien}</span>
          </button>
          {alertes && (
            <>
              {/* Un voile transparent ferme le panneau au premier clic
                  ailleurs, sans piéger le reste de la page. */}
              <button type="button" className={styles.voile} aria-label={t("Fermer")} onClick={() => setAlertes(false)} />
              <div className={`${styles.panneau} ${p.dock === "bottom-left" ? styles.panneauHaut : ""}`} role="group" aria-label={t("Ce qui vous attend")}>
                <div className={styles.panneauTete}>
                  <b>
                    {t("Ce qui vous attend")} · {combien}
                  </b>
                </div>
                {/* LE BROUILLON EN TÊTE, et avec SA propre issue.
                    Les attentes du dossier renvoient leur seconde issue à la
                    page où la décision se prend — on ne retire pas un ordre
                    depuis un panneau de trois cents pixels, à un doigt de
                    « Signer ». Un brouillon n'est pas cela : rien n'est parti,
                    le desk ne tient rien, et le jeter ne coûte que la frappe
                    qu'on recommencera. Il s'abandonne donc ici, d'un bouton. */}
                {brouillon && (
                  <div className={styles.att} data-ton="annonce">
                    <button type="button" className={styles.attTete} aria-expanded={choisie === "brouillon"} onClick={() => setChoisie(choisie === "brouillon" ? null : "brouillon")}>
                      <span className={styles.attQuand}>{t("Un ordre commencé")}</span>
                      <span className={styles.attChiffre}>{brouillon.montant}</span>
                      <svg className={styles.attChev} viewBox="0 0 24 24" aria-hidden="true" data-ouvert={choisie === "brouillon" ? "oui" : undefined}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {choisie === "brouillon" && (
                      <div className={styles.attCorps}>
                        <p>{t("Sur {l}. Vous ne l'avez pas envoyé : il vous attend tant que vous ne le reprenez pas ou ne l'abandonnez pas.", { l: brouillon.titre })}</p>
                        <Link className={styles.attGeste} href={reprendre(brouillon)} onClick={() => setAlertes(false)}>
                          {t("Reprendre")}
                        </Link>
                        <button type="button" className={styles.attSortie} onClick={() => poserLeBrouillon(null)}>
                          {t("Abandonner")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {attentes.map((a) => {
                  const deploye = choisie === a.cle;
                  return (
                    <div key={a.cle} className={styles.att} data-ton={a.ton}>
                      <button type="button" className={styles.attTete} aria-expanded={deploye} onClick={() => setChoisie(deploye ? null : a.cle)}>
                        <span className={styles.attQuand}>{t(a.quand.key, a.quand.params)}</span>
                        <span className={styles.attChiffre}>{typeof a.chiffre === "string" ? a.chiffre : t(a.chiffre.key, a.chiffre.params)}</span>
                        <svg className={styles.attChev} viewBox="0 0 24 24" aria-hidden="true" data-ouvert={deploye ? "oui" : undefined}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {deploye && (
                        <div className={styles.attCorps}>
                          <p>{t(a.quoi.key, a.quoi.params)}</p>
                          <Link className={styles.attGeste} href={a.href} onClick={() => setAlertes(false)}>
                            {t(a.geste)}
                          </Link>
                          {/* LES DEUX ISSUES, ET AUCUNE NE SE JOUE ICI.
                              La pastille portait un « ne plus me le rappeler »,
                              et c'était une troisième issue qui n'en est pas
                              une : le panier restait plein, le desk gardait un
                              ordre fantôme au carnet, et au bout de cinq jours
                              ouvrés l'ordre non réglé devenait un manquement
                              inscrit à la tenue du client. Faire taire le
                              rappel, c'était le laisser glisser vers la
                              sanction en silence.
                              Le second lien renvoie donc à la page de l'ordre,
                              à l'ancre où la question se pose, et non à une
                              action qui se jouerait dans un panneau de trois
                              cents pixels à un doigt de « Signer ». On y
                              retourne pour finir, ou on y retourne pour
                              renoncer. */}
                          {a.sortie && (
                            <Link className={styles.attSortie} href={a.sortie.href} onClick={() => setAlertes(false)}>
                              {t(a.sortie.geste)}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* UNE SEULE LOUPE PAR ÉCRAN, et c'est le rail qui gagne quand il est là.
          Au-delà de 1040 px, la colonne de gauche porte son propre champ en
          tête — « Chercher une page, un code » — et la feuille du compte vit à
          son pied : deux loupes se voyaient sur le même écran, à huit cents
          pixels l'une de l'autre, pour deux corpus différents que rien ne
          distinguait à l'œil. Le pied de colonne n'a donc pas la sienne. En
          dessous, le rail n'existe pas et la loupe est le seul chemin.
          LE DESK N'EN A PAS NON PLUS : sa console a sa propre recherche.
          ET PAS SUR LA PAGE DE RECHERCHE : la feuille y recouvrirait le champ
          qu'elle duplique, avec six résultats là où la page les montre tous.
          La même règle, appliquée au cas où la page EST la loupe. */}
      {!p.desk && p.dock !== "bottom-left" && chemin !== "/recherche" && (
        <>
          <button type="button" className={styles.loupe} onClick={() => setCherche(true)} aria-haspopup="dialog" aria-expanded={cherche} aria-label={t("Rechercher")} title={t("Rechercher")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          {/* PLEIN ÉCRAN, ET LE CHAMP CESSE DE BOUGER.
              Relevé à l'écran le 28 octobre 2026 : « la barre de recherche
              monte et descend avec la liste des résultats, et moins il y a de
              résultats plus elle se cache derrière le clavier ». La feuille
              est collée EN BAS sur téléphone et sa hauteur suit son contenu :
              le champ étant en tête de feuille, deux résultats le posaient à
              quelques centimètres du bord inférieur, c'est-à-dire sous le
              clavier qu'on venait d'ouvrir pour taper dedans. Chaque lettre
              tapée le déplaçait, puisque chaque lettre change le nombre de
              réponses.
              Une feuille de pleine hauteur a un haut fixe : le champ s'y pose
              une fois pour toutes, loin du clavier, et seules les réponses
              défilent. C'est le réglage que la maison avait déjà écrit pour la
              feuille du compte, et pour la même raison. */}
          <Sheet open={cherche} onClose={() => setCherche(false)} navy tall dock={p.dock ?? "top-right"} title={t("Rechercher")}>
            <MenuRecherche index={index} close={() => setCherche(false)} />
            {/* LA FEUILLE RÉPOND VITE, LA PAGE RÉPOND ENTIÈREMENT.
                Six résultats tiennent ici, et c'est ce qu'on veut quand on
                cherche un mot sans quitter sa page. La page, elle, les donne
                tous, avec le type de chacun, la phrase où le mot apparaît et
                les flèches du clavier. Ce lien est le pont entre les deux :
                tant que les deux existent, aucune des deux n'est une impasse. */}
            <Link className={styles.tout} href="/recherche" onClick={() => setCherche(false)}>
              {t("Ouvrir la recherche entière")} →
            </Link>
          </Sheet>
        </>
      )}

      {/* L'INITIALE MÈNE AU COMPTE, et c'est tout ce qu'elle fait. Elle ouvrait
          une feuille de deux écrans de défilement ; elle ouvre un sommaire de
          cinq lignes, qui a une adresse et un retour. */}
      <Link href="/moi/compte" className={styles.avatar} aria-label={t("Votre compte")} title={p.name}>
        {initial}
      </Link>
    </>
  );
}
