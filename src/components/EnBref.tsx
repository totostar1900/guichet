"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { briefDuService, briefParId } from "@/lib/domain/briefs";
import { PROSE } from "@/components/briefs/prose";
import { TitreDeBrief } from "@/components/briefs/parties";
import { CATALOGUE, ETAPES, RAISON } from "@/lib/domain/services";
import styles from "./EnBref.module.css";

/**
 * LE BRIEF D'UN SERVICE, ET IL N'Y EN A QU'UN PAR SERVICE.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ, en deux temps. Le 25 octobre 2026 : un « En
 * bref » en tête de chaque page, qui explique les étapes, et que la page des
 * adjudications grandisse de ce que disait la page intermédiaire. Le
 * 31 octobre : que le « i » d'une tuile de Trade et le « En bref » d'une page
 * de service ouvrent LA MÊME PAGE — « c'est pas deux pages distinctes mais
 * bien la même page, qui pourra être reportée ailleurs au besoin ».
 *
 * CE QUI A DÉCIDÉ DE LA FORME. Il y a huit pages de destination pour onze
 * services, et chacune aurait pu recevoir sa prose. Huit proses écrites à la
 * main, c'est huit occasions de diverger de ce que Trade disait déjà — et la
 * maison a payé cette facture-là assez souvent pour la reconnaître : un
 * sommaire qui citait cinq pages quand le rail en citait sept, deux
 * définitions d'« une séance », trois tris de la même liste.
 *
 * LE BRIEF NE PORTE DONC AUCUN TEXTE DE SERVICE. Il lit `RAISON` — à quoi ça
 * sert — et `ETAPES` — ce qu'il va falloir faire — dans le catalogue.
 * Changer une étape la change partout, et un service ajouté au catalogue
 * arrive avec son brief.
 *
 * CE QUI EST PROPRE À UN BRIEF vit dans « briefs/prose », indexé par le même
 * identifiant : ce que l'adjudication a de particulier — le prix affiché n'est
 * qu'une proposition —, les quatre catégories d'OPCVM. Ce sont des choses que
 * le catalogue ne porte pas et ne doit pas porter : elles parlent du MARCHÉ,
 * pas du service. Elle a quitté les pages le 31 octobre 2026, parce que Trade
 * n'a aucun moyen d'atteindre du JSX écrit dans le corps d'une page.
 *
 * UN BRIEF PEUT SERVIR PLUSIEURS SERVICES, et c'est le cas de trois d'entre
 * eux : les adjudications portent la séance et le rachat ; la cote porte la
 * cote et les souscriptions ; les fonds portent les fonds et l'arbitrage. Le
 * brief les nomme tous, dans l'ordre reçu, chacun avec sa raison et ses
 * étapes. Un « i » posé sur l'une des deux tuiles ouvre donc une feuille qui
 * parle aussi de l'autre : elles partagent un brief parce qu'elles partagent
 * un écran.
 *
 * ET UN BRIEF PEUT N'EN SERVIR AUCUN : la conservation a cessé d'être un
 * service, et ce que la maison doit au client sur la garde de ses titres est
 * resté. Voir « domain/briefs ».
 */
export function EnBref({ brief }: { brief: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const b = briefParId(brief);
  if (!b) return null;
  const { Avant, Apres } = PROSE[b.id] ?? {};
  /* Le nom vient du catalogue, comme le reste : un appel qui l'écrirait à la
     main appellerait « Passage » un service renommé « Arbitrage ». */
  const nom = (cle: string) => CATALOGUE.find((c) => c.cle === cle)?.nom ?? cle;
  return (
    <>
      <BoutonBrief titre={t(b.titre)} coach={b.coach ?? `enbref-${b.id}`} onClick={() => setOpen(true)} />
      {/* UNE PAGE ENTIÈRE, ET NON UN PANNEAU AU COIN.
          DEMANDÉ LE 29 OCTOBRE 2026 : « chaque en bref sera sur une page
          complète avec sa croix pour refermer ». La feuille s'ouvrait du
          bord de son déclencheur — règle de la maison pour un MENU, qui se
          referme d'un regard. Un brief n'est pas un menu : c'est le seul
          texte de la page qui explique à quoi sert ce qu'on regarde, et un
          panneau au coin se lit en diagonale. La croix reste la sortie,
          comme avant. */}
      <Sheet open={open} onClose={() => setOpen(false)} title={t(b.titre)} plein>
        <div className={styles.corps}>
          {Avant && <Avant />}
          {b.cles.map((cle) => (
            <section key={cle} className={styles.service}>
              {/* Le nom du service n'est répété que lorsqu'un brief en porte
                  plusieurs : seul, il redirait le titre de la feuille. */}
              {b.cles.length > 1 && <TitreDeBrief>{t(nom(cle))}</TitreDeBrief>}
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
          {Apres && <Apres />}
        </div>
      </Sheet>
    </>
  );
}

/**
 * LE BRIEF D'UN SERVICE, OUVERT DEPUIS SA TUILE.
 *
 * La tuile de Trade connaît une clef de service ; le brief se nomme par son
 * identifiant. Cette résolution se fait ICI plutôt que dans la tuile, pour
 * qu'il n'y ait qu'un endroit qui sache répondre à « quel brief explique ce
 * service » — et c'est « domain/briefs » qui le sait.
 *
 * Un service sans brief ne rend rien : pas de rond mort au coin d'une tuile.
 * Le cliquet, lui, refuse qu'un service du catalogue soit dans ce cas.
 */
export function BriefDuService({ cle }: { cle: string }) {
  const b = briefDuService(cle);
  return b ? <EnBref brief={b.id} /> : null;
}

/**
 * LE ROND « i », ET IL EST LE MÊME PARTOUT — 31 octobre 2026.
 *
 * CE QU'IL ÉTAIT : un bouton de commande, bordé, haut comme un champ de
 * saisie, portant le mot « En bref » à côté de son dessin. La feuille qu'il
 * ouvre est une lecture facultative ; sa taille disait une action du même rang
 * que « Approvisionner ».
 *
 * CE QU'IL EST : un rond de la taille de son dessin, au trait fin. Le mot
 * reste pour qui écoute la page — c'est le titre de la feuille qui part en
 * « aria-label », donc « Les fonds en bref » et non « En bref », ce qui est
 * plus précis que ce que l'œil lisait avant.
 *
 * UN SEUL OBJET POUR LES DEUX SURFACES, et c'est tout le point : l'en-tête
 * d'une page de service et le coin d'une tuile de Trade ouvrent la même
 * feuille, donc ils ne peuvent pas porter deux boutons différents. La
 * position, elle, appartient à la surface — l'en-tête le pose à côté du
 * titre, la tuile dans son coin — et c'est la seule chose qui les distingue.
 */
export function BoutonBrief({ titre, coach, onClick }: { titre: string; coach: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.bouton} onClick={onClick} aria-haspopup="dialog" aria-label={titre} title={titre} data-coach={coach}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 7.6v.9" />
      </svg>
    </button>
  );
}
