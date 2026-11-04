"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarreDuCompte } from "./BarreDuCompte";
import { BarreDuHaut } from "./BarreDuHaut";
import { MarketFab } from "./MarketFab";
import { reculer } from "./retour";
import type { Attente } from "@/lib/domain/services";
import styles from "./MobileShell.module.css";
import { useListeDeLaFiche } from "@/components/LieuDeLaFiche";
import { lieuDe } from "@/lib/domain/lieu";
import { isAideSection, isEspaceSection, isMarcheSection, isTradeSection, listForFiche } from "@/lib/nav-section";

/**
 * The phone shell (≤ 760 px): a top bar with a real « back » and the page
 * title, and a bottom tab bar with the four destinations. Desktop keeps the
 * site header; both are rendered, CSS shows one. The back arrow returns to
 * the list the reader came from, same filters, same scroll, using the
 * browser history when it is ours, or the last list URL we remembered.
 */
export const LAST_LIST_KEY = "guichet:lastList";

// LA FLÈCHE DE RETOUR PARAÎT SUR TOUTES LES PAGES, SAUF L'ACCUEIL ET LA CONNEXION (5 novembre 2026). Elle ne paraissait pas sur les sièges du
// dock (Titres, Fonds, Marché, Aide…) et paraissait sur les autres : « la barre du haut n'a pas toujours le retour ». Sur un siège, « reculer »
// revient à la page d'où l'on vient quand elle est de chez nous, et sinon au repli du siège (voir « retour.ts »).
const SANS_FLECHE = ["/", "/connexion"];

/**
 * `feuille` : le siège ouvre sa liste au lieu de sauter sur une page.
 *
 * Trois sièges sur cinq en portent une, et c'est la même règle que la bande de
 * l'écran large : un siège qui est à la fois un lien et un bouton demande au
 * pouce de viser, et le pouce vise mal. L'ancienne racine devient le premier
 * élément de la liste, nommée, plutôt que de disparaître.
 */
type Tab = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean; badge?: number};

/** Les trois listes, lues de la même table que la bande de l'écran large. */
/* L'en-tête ne porte plus que le nom du siège : la phrase qui le suivait
   redisait ce que les tuiles montrent, et volait une ligne en tête de feuille. */

const I = {
  /* Un point d'interrogation dans un cercle : on demande, ou l'on cherche. */
  aide: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5" />
      <path d="M12 17h.01" />
    </svg>
  ),
  guichet: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  // Trader : une courbe qui monte vers une flèche, donc le geste et non l'objet.
  trader: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17l5-6 4 4 6-9" />
      <path d="M14 6h6v6" />
    </svg>
  ),
  fonds: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17l5-6 4 4 4-7 5 5" />
      <path d="M3 21h18" />
    </svg>
  ),
  moi: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  ),
  apprendre: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" />
      <path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
    </svg>
  ),
  actualites: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h13v14H6a2 2 0 0 1-2-2z" />
      <path d="M17 9h3v8a2 2 0 0 1-2 2M7 9h6M7 13h6M7 17h4" />
    </svg>
  ),
  desk: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 15h4" />
    </svg>
  ),
};

function fallbackFor(path: string): string {
  if (path.startsWith("/offres")) {
    try {
      const last = sessionStorage.getItem(LAST_LIST_KEY);
      if (last) return last;
    } catch {
      // storage unavailable
    }
    return listForFiche(path);
  }
  if (path.startsWith("/fonds")) return "/fonds";
  if (path.startsWith("/societes") || path.startsWith("/emetteurs")) return "/societes";
  if (path.startsWith("/desk")) return "/desk";
  if (path.startsWith("/actualites")) return "/actualites";
  if (path.startsWith("/moi") || path.startsWith("/ouvrir-un-compte")) return "/moi";
  if (path.startsWith("/info") || path.startsWith("/comparer")) return "/info";
  return "/";
}

export function MobileShell({ signedIn, name, desk, deskHost = false, attentes = [], urgentes = 0, favoris = false, menu }: { signedIn: boolean; name?: string; desk: boolean; /** the desk's own host: no client tab bar */ deskHost?: boolean; /** Ce qui attend le client, pour la pastille de la barre : voir BarreProps. */ attentes?: Attente[]; /** Les lignes qui ferment sous sept jours : le nombre de l'horloge. */ urgentes?: number; /** Le client a un favori : l'étoile paraît. */ favoris?: boolean; menu?: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isRoot = SANS_FLECHE.includes(path);

  /**
   * LA BARRE DIT OÙ L'ON EST, ET NE DIT JAMAIS LE NOM DE LA PAGE.
   *
   * Elle cédait le nom au `h1` tant qu'il était à l'écran et le reprenait dès
   * qu'il passait dessous : tantôt un titre, tantôt rien. Décidé le 31 octobre
   * 2026, sur maquette : elle porte le LIEU — le siège, et la rubrique quand il
   * y en a une — à toute hauteur de défilement, de la même façon sur toutes les
   * pages. Le titre reste dans la page, une seule fois. Le nom lu dans
   * l'onglet ne sert plus qu'à ranger une page en favori (« BarreDuHaut »).
   */
  /* UNE FICHE DIT SA FAMILLE (8 novembre 2026) : sous « /offres/… » l'adresse ne la porte pas, la barre disait « Titres » devant une adjudication. */
  const listeDeLaFiche = useListeDeLaFiche(path);
  const lieu = lieuDe(listeDeLaFiche ?? path);

  // Did this tab see another of our pages before this one? Then the browser history is ours.
  useEffect(() => {
    try {
      const prev = sessionStorage.getItem("guichet:here");
      if (prev && prev !== path) sessionStorage.setItem("guichet:cameFrom", prev);
      sessionStorage.setItem("guichet:here", path);
    } catch {
      // storage unavailable
    }
  }, [path]);

  /* Le repli d'un siège est parfois lui-même (« /fonds » → « /fonds ») : reculer n'irait nulle part, on retombe alors sur l'accueil. */
  const back = () => {
    const repli = fallbackFor(path);
    reculer(router, repli === path ? "/" : repli);
  };

  const t = useT();
  /**
   * Quatre destinations, et c'est la même règle que la bande de l'écran large.
   *
   * Le dock en portait cinq, rangés par instrument. Un client se connecte pour
   * voir ce qu'il a et pour traiter : la racine porte le premier, Trade le
   * second, Marché ce qui se lit, Aide ce qui se demande. Titres, Fonds et
   * Adjudications tiennent sous Trade, en onglets de section, et gardent
   * chacun leur page.
   *
   * QUATRE PLUTÔT QUE CINQ, parce que le cinquième nommait deux fois le même
   * sujet. Un dock à quatre laisse aussi respirer les libellés : à 390 px,
   * cinq sièges donnent 78 px chacun, et « Instruments » n'y tenait qu'en
   * coupant.
   */
  const tabs: Tab[] = [
    /* ACCUEIL, ET NON PLUS PORTEFEUILLE. Le siège menait à « /portefeuille »,
       un sommaire dont la première rubrique était la racine : un palier pour
       arriver là d'où l'on venait. Le dock mène maintenant à la racine, qui
       porte ce qui attend, la provision, les lignes et les chemins. Le mot
       change avec la destination : « Accueil » dit une page d'arrivée,
       « Portefeuille » disait un contenu — et le contenu n'est plus tout ce
       qu'elle porte. */
    { href: "/", label: t("Accueil"), icon: I.moi, match: isEspaceSection },
    /* TRADE A ABSORBÉ INSTRUMENTS. Les deux sièges répondaient au même sujet
       par deux axes : l'intention et l'objet. Les cinq services de « Placer »
       menaient déjà aux trois familles, donc le second siège nommait une
       seconde fois ce que le premier menait. Un siège de moins, et la
       quatrième place du dock libérée. */
    { href: "/trader", label: t("Trade"), icon: I.trader, match: isTradeSection },
    { href: "/marche", label: t("Marché"), icon: I.guichet, match: isMarcheSection },
    /* LE CINQUIÈME SIÈGE : DEMANDER, ET TROUVER SOI-MÊME. Quatre onglets
       menaient à ce qu'on possède, ce qu'on achète, ce qu'on fait et ce
       qu'on lit du marché ; aucun à la maison elle-même. Le conseiller et
       le guide vivaient au bas de « Trade », où l'on ne tombait dessus
       qu'en descendant une page venue pour autre chose.
       « Aide » plutôt qu'« Apprendre » ou « Contact » : le siège couvre
       deux gestes de nature différente — poser une question à quelqu'un, et
       chercher la réponse tout seul — et c'est le mot le plus court qui les
       couvre tous les deux. C'est déjà le nom du groupe au rail de l'écran
       large, et deux surfaces qui nomment la même chose doivent la nommer
       pareil. */
    { href: "/aide", label: t("Aide"), icon: I.aide, match: isAideSection },
    /* « À DÉCIDER » A QUITTÉ LE DOCK le 2 octobre 2026. Un onglet qui porte ce
       nom demande d'aller voir s'il y a quelque chose, et il est vide neuf jours
       sur dix : un onglet vide neuf jours sur dix est un onglet qu'on cesse
       d'ouvrir. La bande en tête du portefeuille le dit sans qu'on y aille, et
       le nombre se lit au passage. Le siège libéré revient à Instruments. */
  ];

  return (
    <>
      {/* LES DEUX BARRES NE GLISSENT PAS pendant une transition de page : il
          faut un point fixe pour comprendre que c'est le CONTENU qui a bougé
          et non l'écran entier. Le nom les désigne, la feuille globale leur
          retire l'animation. */}
      <div className={styles.top} style={{ viewTransitionName: "barre-haut" }}>
        {/* LA MARQUE A QUITTÉ LA BARRE, le 24 octobre 2026.
            Elle tenait le tiers gauche de tous les sièges du dock, sur
            l'écran le plus étroit de la maison, pour dire une chose que le
            client sait déjà : chez qui il est. Il vient d'ouvrir son
            application ; il ne cherche pas le nom de sa société de bourse, il
            cherche où il en est.
            ELLE MENAIT À « / » DEPUIS « / ». Sur la racine, c'est-à-dire
            partout où elle paraissait en premier, le lien ramenait à la page
            qu'on regardait.
            ET ELLE ÉTAIT ÉCRITE EN DUR. « PURPOSE CAPITAL » en littéral, à
            côté d'un « config.ts » qui se présente comme « the one place to
            change names ». Le pied de page, lui, lit COMPANY : les deux
            auraient fini par ne plus dire la même chose.
            La maison se nomme toujours — au pied de chaque page, en tête de
            la colonne des grands écrans, et sur l'écran de connexion. Elle ne
            se nomme plus là où la place manque.
            CE QUI PREND SA PLACE N'EST RIEN, et c'est le but : la barre porte
            le nom de la PAGE, et le cède au `h1` tant qu'il est à l'écran.
            Sur la racine, où il n'y a pas de parent, la flèche de retour ne
            paraît pas : un siège du dock n'a nulle part où remonter. */}
        {!isRoot && (
          <button type="button" className={styles.back} onClick={back} aria-label={t("Retour")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        <div className={styles.lieu}>
          {lieu && (
            <>
              <span className={styles.siege}>{t(lieu.siege)}</span>
              {lieu.rubrique && <span className={styles.rubrique}>{t(lieu.rubrique)}</span>}
            </>
          )}
        </div>
        <div className={styles.right}>
          {/* LA LANGUE N'EST PAS ICI. Elle y est passée une matinée, le temps de
              constater que la barre tient un titre de 116 px et trois objets à
              sa droite. Elle vit en tête de la feuille « Bonjour », à côté du
              nom, et dans le « ⋮ » pour qui n'est pas entré. */}
          {desk && (
            <Link href="/desk" className={`${styles.deskLink} ${path.startsWith("/desk") ? styles.deskOn : ""}`}>
              {t("Desk")}
            </Link>
          )}
          {/* LE VISITEUR N'A PLUS SA PORTE DANS CETTE BARRE : les deux portes
              vivent en bas, dans la bande de la vitrine (PorteVitrine), à la
              place que ce dock laisse libre à qui n'est pas entré. Garder ce
              lien, c'était afficher « Se connecter » deux fois sur le même
              écran, et reprendre au titre la largeur que la barre n'a pas. */}
          {/* UN CLIENT A L'HORLOGE, L'ÉTOILE ET LE MENU ; le desk garde la barre
              du compte et son lien « Desk ». Voir BarreDuHaut. */}
          {signedIn && !desk && <BarreDuHaut attentes={attentes} urgentes={urgentes} favoris={favoris} />}
          {signedIn && desk && <BarreDuCompte name={name ?? "?"} desk={desk} attentes={attentes} />}
          {menu}
        </div>
      </div>

      {/* LES PAGES VOISINES DU MARCHÉ, SOUS UN BOUTON ET NON EN BANDEAU.
          Le bandeau de pastilles occupait la première bande de l'écran, celle
          où l'on cherche le titre de la page qu'on vient d'ouvrir, et n'en
          montrait que deux à la fois sur sept. Voir « MarketFab ». */}
      {!deskHost && <MarketFab />}

      {/* Le dock ne parait qu a qui est entre. Tout ce qu il porte demande une
          connexion : le montrer a un visiteur serait lui offrir quatre portes
          fermees sous le pouce. Devant la porte, la page se suffit, avec son
          menu « ⋮ » et ses propres appels a l action. */}
      {!deskHost && signedIn && (
      <nav className={styles.tabs} aria-label="Navigation principale" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, viewTransitionName: "barre-bas" }}>
        {tabs.map((tab) => {
          const face = (
            <>
              <span className={styles.icon}>
                {tab.icon}
                {tab.badge ? <em>{tab.badge}</em> : null}
              </span>
              {t(tab.label)}
            </>
          );
          /* LES CINQ SIÈGES SONT DES LIENS, et plus aucun n'ouvre de tiroir.
             Trois d'entre eux ouvraient une feuille de tuiles par le bas ;
             ils mènent à leur sommaire, qui a l'adresse, le retour système
             et la place d'une phrase entière. */
          return (
            <Link key={tab.href} href={tab.href} aria-current={tab.match(path) ? "page" : undefined}>
              {face}
            </Link>
          );
        })}
      </nav>
      )}

      {/* LE TIROIR DE TUILES A VÉCU, le 23 octobre 2026. Les trois sièges
          ouvraient une feuille par le bas : une grille de trois mots posée
          par-dessus la page qu'on regardait. Elle coûtait déjà deux gestes —
          toucher le siège, choisir — sans rien offrir en échange : pas
          d'adresse à partager, pas de retour système, et une phrase amputée à
          trois mots parce qu'une tuile n'a pas la place.
          Chacun a son sommaire : « /portefeuille », « /instruments », et
          « /marche », qui était déjà la porte de son monde. */}
    </>
  );
}
