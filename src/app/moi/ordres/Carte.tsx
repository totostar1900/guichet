"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { retirerMonOrdre } from "../counter-actions";
import styles from "./Carte.module.css";

/**
 * UNE INTENTION EN COURS : CE QU'ELLE EST, OÙ ELLE EN EST, CE QU'ELLE ATTEND.
 *
 * ─── Les quatre défauts relevés le 1er novembre 2026 ───────────────────────
 *
 * LE MENU S'OUVRAIT DANS LA RANGÉE DU TITRE. « OrdreMenu » était le troisième
 * enfant d'un « flex » qui porte le titre et la pastille d'état : déplié, il
 * devenait une colonne coincée entre les deux, le titre se repliait sur trois
 * lignes coupées en plein milieu d'une référence, et le bouton « ··· »
 * DISPARAISSAIT — remplacé par le panneau. Le geste évident pour refermer,
 * retoucher là où l'on a touché, n'existait donc plus ; « Fermer » était le
 * dernier mot du panneau et le plus pâle de tous. D'où « ça ne se ferme
 * pas », vu à l'écran par le dirigeant. Il n'y avait ni Échap ni clic dehors.
 *
 * LE MENU N'ÉTAIT PAS UN MENU. Son troisième item, sur un ordre transmis,
 * était un paragraphe gris : « l'ordre est parti au marché, il ne se retire
 * plus ». Une explication dans une liste de commandes se lit comme une
 * commande en panne. Elle est descendue dans le dépli, où elle est une
 * information parmi les autres.
 *
 * LA FLÈCHE NE MENAIT NULLE PART. La phrase de suite était précédée d'un « → »
 * doré et gras, posé par la feuille. C'était du texte. Pire : sur un ordre
 * confirmé elle disait « signez le bulletin », alors que l'écran où l'on
 * signe EXISTE — « /moi/ordres/{id} », avec sa signature par code — et que la
 * carte n'y menait pas. Les ordres CLOS y menaient ; les ordres en cours,
 * non. Le seul ordre qui avait quelque chose à faire était le seul sans
 * porte. Désormais : un bouton là où il y a un geste, et AUCUNE flèche là où
 * il n'y en a pas.
 *
 * LA PISTE NE DISAIT PAS SES ARRÊTS. Cinq segments anonymes, et la légende
 * écrite une fois en tête de section, à quatre cents pixels. Les cinq noms
 * sont sous les segments, et celui où l'on est se distingue.
 *
 * ─── Ce que le dépli porte, et pourquoi il n'est pas sur la carte ──────────
 *
 * Le prix limite, le prix exécuté, la part servie, les termes d'une
 * contre-proposition, le canal : tout cela existait dans la donnée et ne se
 * lisait nulle part. Mais douze lignes par carte sur quatre cartes font un
 * mur, et ce qu'on vient chercher d'abord est « où en est mon ordre ». Le
 * repli répond à cela ; le dépli répond à « et dans le détail ? ».
 */
export function CarteOrdre({
  id,
  etat,
  etatLabel,
  titre,
  ligneHref,
  resume,
  etape,
  arrets,
  suite,
  geste,
  counter,
  details,
  retirable,
  raisonNonRetrait,
  refOrdre,
}: {
  id: string;
  etat: string;
  etatLabel: string;
  titre: string;
  /** La ligne du marché : une destination de lecture, pas le geste de l'ordre. */
  ligneHref: string;
  /** Le type, le montant et la date, déjà formatés par le serveur. */
  resume: string;
  /** L'arrêt où l'on est, de 0 à 4 ; -1 pour un ordre qui n'y est plus. */
  etape: number;
  arrets: string[];
  /** Ce qui se passe ensuite, en une phrase. Jamais une flèche : voir la note. */
  suite: string;
  /** Le geste attendu du client, quand il y en a un, et où il mène. */
  geste?: { mot: string; href: string };
  /** La contre-proposition, rendue par le serveur : elle porte ses deux boutons. */
  counter?: ReactNode;
  /** Le détail de l'opération, rendu par le serveur pour garder les formats. */
  details: ReactNode;
  retirable: boolean;
  /** Pourquoi on ne peut plus retirer, quand c'est le cas. */
  raisonNonRetrait?: string;
  refOrdre: string;
}) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const carte = useRef<HTMLDivElement>(null);

  /* ÉCHAP ET LE CLIC DEHORS, qui manquaient tous les deux. Un panneau qu'on
     ouvre d'un doigt et qu'on ne referme qu'en visant un mot gris est un
     panneau qui reste ouvert. */
  useEffect(() => {
    if (!menu) return;
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const dehors = (e: MouseEvent) => {
      if (carte.current && !carte.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", touche);
    document.addEventListener("mousedown", dehors);
    return () => {
      document.removeEventListener("keydown", touche);
      document.removeEventListener("mousedown", dehors);
    };
  }, [menu]);

  return (
    <div className={styles.carte} ref={carte}>
      <div className={styles.tete}>
        <div className={styles.quoi}>
          {/* LE TITRE MÈNE À L'ORDRE, ET NON À LA LIGNE. C'est l'ordre qu'on
              vient suivre ; la ligne se lit depuis le menu, où elle est ce
              qu'elle est — une lecture de côté. */}
          <b>
            <Link href={`/moi/ordres/${id}`}>{titre}</Link>
          </b>
          <small>{resume}</small>
        </div>
        <span className={`st ${etat}`}>{etatLabel}</span>
        {/* LE BOUTON RESTE EN PLACE ET BASCULE. Il ne disparaît plus derrière
            son propre panneau : c'est le même point à toucher pour ouvrir et
            pour refermer. */}
        <button
          type="button"
          className={styles.points}
          aria-label={t("Autres actions sur cet ordre")}
          aria-expanded={menu}
          aria-haspopup="menu"
          onClick={() => setMenu((x) => !x)}
        >
          ···
        </button>
      </div>

      {/* LE MENU EST SOUS LA RANGÉE, ET NON DEDANS, et il ne porte que des
          actions : voir, écrire, retirer. La raison d'un retrait impossible
          est descendue dans le dépli. */}
      {menu && (
        <div className={styles.menu} role="menu">
          <Link href={`/moi/ordres/${id}`} role="menuitem" onClick={() => setMenu(false)}>
            {t("Voir l'ordre")}
          </Link>
          <Link href={ligneHref} role="menuitem" onClick={() => setMenu(false)}>
            {t("Voir la ligne")}
          </Link>
          {/* NOUS ÉCRIRE MÈNE À QUI RÉPOND. Il menait à « /info/aide#entretien » :
              cette ancre n'existe pas — le chapitre est à « /info/aide/entretien » —
              donc le lien retombait en haut de l'index de l'aide. Et même à la
              bonne adresse, « Comment Guichet est entretenu » n'est pas un
              moyen d'écrire. « /moi/contact » porte le conseiller et le
              message déjà commencé. */}
          <Link href="/moi/contact" role="menuitem" onClick={() => setMenu(false)}>
            {t("Nous écrire à propos de cet ordre")}
          </Link>
          {retirable && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                setConfirme(true);
              }}
            >
              {t("Retirer cet ordre")}
            </button>
          )}
        </div>
      )}

      {/* LE RETRAIT S'OUVRE AVANT DE S'EXÉCUTER, et dit ce qu'il fait. Un ordre
          retiré ne revient pas : ce n'est pas une suspension, c'est une fin.
          C'est la seule commande de cet écran dont on ne se défait pas d'un
          bouton, et elle pousse la carte plutôt que de flotter. */}
      {confirme && (
        <form action={retirerMonOrdre} className={styles.retrait}>
          <input type="hidden" name="intentId" value={id} />
          <p>{t("Cet ordre sera retiré et ne repartira pas. Pour le replacer, il faudra en passer un nouveau, aux conditions du moment.")}</p>
          <span className={styles.retraitBtns}>
            <button className="btn sm" type="submit">
              {t("Retirer l'ordre {r}", { r: refOrdre })}
            </button>
            <button type="button" className="btn sm ghost" onClick={() => setConfirme(false)}>
              {t("Le garder")}
            </button>
          </span>
        </form>
      )}

      {/* LA PISTE, AVEC SES ARRÊTS NOMMÉS. */}
      <ol className={styles.piste} aria-label={t("Étape {n} sur {m}", { n: etape + 1, m: arrets.length })}>
        {arrets.map((nom, n) => (
          <li key={nom} className={n < etape ? styles.passe : n === etape ? styles.ici : undefined} aria-current={n === etape ? "step" : undefined}>
            <i />
            <span>{nom}</span>
          </li>
        ))}
      </ol>

      {/* LA CONTRE-PROPOSITION PREND TOUTE LA PLACE quand il y en a une : c'est
          elle, le geste, et elle porte ses deux boutons. */}
      {counter ?? (
        <div className={styles.suite}>
          <p>{suite}</p>
          {/* LE BOUTON N'EXISTE QUE LÀ OÙ IL Y A UN GESTE. Un ordre transmis
              n'attend rien du client : lui montrer un bouton serait lui
              demander de faire ce que personne n'attend de lui. */}
          {geste && (
            <Link className="btn sm primary" href={geste.href}>
              {geste.mot}
            </Link>
          )}
        </div>
      )}

      {/* LE DÉPLI. Il garde son état par carte et ne touche pas à l'adresse :
          quatre cartes ouvertes ne sont pas quatre pages. */}
      <button type="button" className={styles.plus} aria-expanded={ouvert} onClick={() => setOuvert((x) => !x)}>
        {ouvert ? t("Replier") : t("Le détail de l'opération")}
        <i aria-hidden="true" className={ouvert ? styles.haut : undefined}>
          ⌄
        </i>
      </button>
      {ouvert && (
        <div className={styles.detail}>
          {details}
          {raisonNonRetrait && <p className={styles.pourquoi}>{raisonNonRetrait}</p>}
        </div>
      )}
    </div>
  );
}
