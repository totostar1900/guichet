"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { CATALOGUE, ETAPES, RAISON } from "@/lib/domain/services";
import styles from "./EnBref.module.css";

/**
 * LES DEUX FORMES QU'UNE PAGE AJOUTE DANS SA FEUILLE, et ce sont des
 * composants, pas des classes.
 *
 * Les modules CSS scopent leurs noms : une page qui écrirait « enbref-titre »
 * en clair ne toucherait rien. La première écriture exportait donc la feuille
 * entière — « classesDuBrief » — et les pages y puisaient « .titre » et
 * « .cats ». ÇA A TENU UNE HEURE : le relevé des classes mortes cherche
 * « <nom local>.X » dans les fichiers qui IMPORTENT la feuille, et aucune
 * page n'importe celle-ci ; « .cats » est donc ressortie morte alors que deux
 * pages l'emploient. L'épreuve avait raison sur le fond — une page ne doit pas
 * nommer les classes d'une autre.
 *
 * Deux composants le disent mieux : la page passe son contenu, la feuille
 * garde ses noms, et le relevé les voit. Il n'y a rien d'autre à exposer — un
 * brief n'a que des titres de section et des définitions.
 */
export function TitreDeBrief({ children }: { children: ReactNode }) {
  return <h3 className={styles.titre}>{children}</h3>;
}

/** Une définition par ligne : son nom, sa phrase. Voir « .cats ». */
export function DefinitionsDeBrief({ children }: { children: ReactNode }) {
  return <dl className={styles.cats}>{children}</dl>;
}

/**
 * LE BRIEF D'UNE PAGE DE SERVICE, ET IL LIT LA MÊME TABLE QUE LA FICHE.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ : un « En bref » en tête de chaque page,
 * comme celui des adjudications, qui explique les étapes ; et que la page des
 * adjudications GRANDISSE des étapes décrites sur la page intermédiaire.
 * Autrement dit : rassembler, à un seul endroit par page, ce que le service
 * fait et comment il se fait.
 *
 * CE QUI A DÉCIDÉ DE LA FORME. Il y a huit pages de destination pour douze
 * services, et chacune aurait pu recevoir sa prose. Huit proses écrites à la
 * main, c'est huit occasions de diverger de la fiche du service, qui dit
 * déjà la même chose dans Trade — et la maison a payé cette facture-là assez
 * souvent pour la reconnaître : un sommaire qui citait cinq pages quand le
 * rail en citait sept, deux définitions d'« une séance », trois tris de la
 * même liste.
 *
 * LE BRIEF NE PORTE DONC AUCUN TEXTE PROPRE. Il lit `RAISON` — à quoi ça sert
 * — et `ETAPES` — ce qu'il va falloir faire — dans le catalogue des services,
 * exactement comme la fiche de Trade. Changer une étape la change aux deux
 * endroits, et un service ajouté au catalogue arrive avec son brief.
 *
 * CE QUI RESTE PROPRE À UNE PAGE passe par « children » : ce que l'adjudication
 * a de particulier — le prix affiché n'est qu'une proposition —, les quatre
 * catégories d'OPCVM. Ce sont des choses que le catalogue ne porte pas et ne
 * doit pas porter : elles parlent du MARCHÉ, pas du service.
 *
 * UNE PAGE PEUT SERVIR PLUSIEURS SERVICES, et c'est le cas de trois d'entre
 * elles : le calendrier porte les adjudications, le sondage et les rachats ;
 * la cote porte la cote et les souscriptions ; les fonds portent les fonds et
 * l'arbitrage. Le brief les nomme tous, dans l'ordre reçu, chacun avec sa
 * raison et ses étapes. C'est la réunion que le dirigeant a demandée.
 */
export function EnBref({
  cles,
  titre,
  coach,
  children,
}: {
  cles: string[];
  titre: string;
  /**
   * L'ANCRE DE LA VISITE GUIDÉE, quand une page en a une.
   *
   * Elle se déduit de la première clef par défaut — « enbref-fonds » — et
   * c'est assez pour les pages sans visite. La page des fonds, elle, a une
   * étape de visite qui VISE ce bouton : son nom est alors un contrat entre
   * deux fichiers, et un contrat ne se déduit pas d'un ordre de tableau. Le
   * jour où l'on écrirait `cles={["passage", "fonds"]}`, l'ancre déduite
   * changerait et la bulle de la visite se poserait dans le vide, sans que
   * rien ne tombe.
   */
  coach?: string;
  children?: ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  /* Le nom vient du catalogue, comme le reste : une page qui l'écrirait à la
     main appellerait « Passage » un service renommé « Arbitrage ». */
  const nom = (cle: string) => CATALOGUE.find((c) => c.cle === cle)?.nom ?? cle;
  return (
    <>
      <button type="button" className={styles.bouton} onClick={() => setOpen(true)} aria-haspopup="dialog" data-coach={coach ?? `enbref-${cles[0]}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 7.6v.9" />
        </svg>
        {t("En bref")}
      </button>
      {/* La feuille s'ouvre du bord de son déclencheur, règle de la maison :
          le bouton est au coin haut droit, en face du titre. */}
      <Sheet open={open} onClose={() => setOpen(false)} title={t(titre)} dock="top-right">
        <div className={styles.corps}>
          {children}
          {cles.map((cle) => (
            <section key={cle} className={styles.service}>
              {/* Le nom du service n'est répété que lorsqu'une page en porte
                  plusieurs : seul, il redirait le titre de la feuille. */}
              {cles.length > 1 && <TitreDeBrief>{t(nom(cle))}</TitreDeBrief>}
              {RAISON[cle] && <p>{t(RAISON[cle])}</p>}
              {ETAPES[cle]?.length > 0 && (
                <ol className={styles.etapes}>
                  {ETAPES[cle].map((e) => (
                    <li key={e}>{t(e)}</li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </Sheet>
    </>
  );
}
