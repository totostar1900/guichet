"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BarreDuCompte } from "./BarreDuCompte";
import { MarketChips } from "./MarketChips";
import type { Attente } from "@/lib/domain/services";
import styles from "./MobileShell.module.css";
import { isEspaceSection, isInstrumentsSection, isMarcheSection, listForFiche } from "@/lib/nav-section";

/**
 * The phone shell (≤ 760 px): a top bar with a real « back » and the page
 * title, and a bottom tab bar with the four destinations. Desktop keeps the
 * site header; both are rendered, CSS shows one. The back arrow returns to
 * the list the reader came from, same filters, same scroll, using the
 * browser history when it is ours, or the last list URL we remembered.
 */
export const LAST_LIST_KEY = "guichet:lastList";

// Une racine ne porte pas de flèche de retour : c'est une destination du dock.
// « /titres » en est une depuis que « / » est devenu la console.
const ROOTS = ["/", "/titres", "/fonds", "/moi", "/info", "/desk", "/connexion", "/actualites", "/marche"];

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

export function MobileShell({ signedIn, name, desk, deskHost = false, attentes = [], menu }: { signedIn: boolean; name?: string; desk: boolean; /** the desk's own host: no client tab bar */ deskHost?: boolean; /** Ce qui attend le client, pour la pastille de la barre : voir BarreProps. */ attentes?: Attente[]; menu?: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const isRoot = ROOTS.includes(path) || path === "/societes";

  // The page title comes from <title>, which every page already sets.
  useEffect(() => {
    const read = () => setTitle(document.title.replace(/\s*[·—-]\s*(Guichet|Purpose Capital).*$/i, "").trim());
    read();
    const t = document.querySelector("title");
    if (!t) return;
    const mo = new MutationObserver(read);
    mo.observe(t, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [path]);

  /**
   * LA BARRE CÈDE LE NOM À LA PAGE, TANT QUE LA PAGE LE PORTE.
   *
   * Les deux l'écrivaient en même temps : « Mes documents » dans la barre, et
   * « Mes documents » en trente pixels trois cents plus bas. Le doublon se
   * voyait sur toute page qui a un titre, c'est-à-dire presque toutes.
   *
   * La barre s'efface donc tant que le `h1` est à l'écran, et revient dès
   * qu'il passe SOUS elle — le repère réapparaît au moment exact où l'autre
   * disparaît, et jamais les deux ensemble. La marge négative vaut la hauteur
   * de la barre, qui recouvre le contenu : sans elle, le titre serait réputé
   * visible alors qu'il est déjà caché derrière.
   *
   * ELLE CÈDE D'ABORD, ET REPREND SI ELLE DOIT. Le défaut du rendu est « la
   * barre se tait », et l'effet ne fait que la rendre à la page sans `h1`.
   * L'inverse — se taire une fois l'observateur installé — faisait clignoter
   * le titre à chaque navigation : il paraissait le temps d'une image, puis
   * s'effaçait en cent quatre-vingts millisecondes, bien visibles.
   *
   * L'ÉTAT N'EST PAS DANS REACT, ET C'EST VOULU : rien d'autre dans l'arbre ne
   * dépend de ce que l'observateur voit, et le passer par un rendu coûtait un
   * `setState` par défilement. Poser une classe est exactement ce qu'un effet
   * est fait pour faire — synchroniser le DOM avec un système extérieur.
   */
  const titreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = titreRef.current;
    if (!el) return;
    const rendreLeNom = () => {
      el.classList.remove(styles.titleCede);
      el.removeAttribute("aria-hidden");
    };
    const h1 = document.querySelector("main h1");
    if (!h1) {
      rendreLeNom();
      return;
    }
    const barre = getComputedStyle(document.documentElement).getPropertyValue("--bar-h").trim() || "62px";
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add(styles.titleCede);
          el.setAttribute("aria-hidden", "true");
        } else rendreLeNom();
      },
      { rootMargin: `-${barre} 0px 0px 0px` },
    );
    io.observe(h1);
    return () => io.disconnect();
    /* « title » entre dans les dépendances pour une raison de calendrier : il
       change quand la page suivante s'est rendue, ce qui donne à l'effet une
       seconde chance de trouver un `h1` arrivé après lui. */
  }, [path, title]);

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

  const back = () => {
    let ours = false;
    try {
      ours = Boolean(sessionStorage.getItem("guichet:cameFrom"));
    } catch {
      // storage unavailable
    }
    // Our own history: go back (Next restores the list scroll). A link opened from WhatsApp: the remembered list.
    if (ours && window.history.length > 1) router.back();
    else router.push(fallbackFor(path));
  };

  const t = useT();
  /**
   * Cinq destinations, et c'est la même règle que la bande de l'écran large.
   *
   * Le dock portait cinq onglets rangés par instrument. Un client se connecte
   * pour voir ce qu'il a et pour traiter : le portefeuille et le marché
   * suffisent à porter les deux, « À décider » porte les gestes, et le compte
   * porte le reste. Titres et Fonds tiennent sous « Marché », en deux onglets
   * de section.
   */
  const tabs: Tab[] = [
    { href: "/portefeuille", label: t("Portefeuille"), icon: I.moi, match: isEspaceSection },
    /* INSTRUMENTS PREND LE SIÈGE LIBÉRÉ. Marché portait les deux à la fois, ce
       qui se lit et ce qui se traite ; trois mots règlent la question : Marché
       se lit, Instruments s'achète, Trader fait. */
    { href: "/instruments", label: t("Instruments"), icon: I.fonds, match: isInstrumentsSection },
    // Trader entre au dock : sans lui, les neuf services n'ont pas de porte sur
    // téléphone, et c'est là que la plupart des clients lisent.
    { href: "/trader", label: t("Trade"), icon: I.trader, match: (p) => p.startsWith("/trader") },
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
    { href: "/aide", label: t("Aide"), icon: I.aide, match: (p) => p === "/aide" || p.startsWith("/info") || p.startsWith("/moi/contact") || p.startsWith("/moi/reclamation") },
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
        {isRoot ? (
          <Link href="/" className={styles.brand}>
            <b>PURPOSE CAPITAL</b>
            <span>Guichet</span>
          </Link>
        ) : (
          <>
            <button type="button" className={styles.back} onClick={back} aria-label={t("Retour")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <div ref={titreRef} className={`${styles.title} ${styles.titleCede}`} aria-hidden="true">
              {title ? t(title) : "…"}
            </div>
          </>
        )}
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
          {signedIn && (
            <BarreDuCompte name={name ?? "?"} desk={desk} attentes={attentes} />
          )}
          {menu}
        </div>
      </div>

      {!deskHost && <MarketChips />}

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
