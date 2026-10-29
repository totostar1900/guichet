"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./NavTabs.module.css";
import { useT } from "@/i18n/client";
import { MARKET_PAGES } from "@/lib/market/pages";
import { PORTEFEUILLE_PAGES, TRADE_PAGES } from "@/lib/nav-groups";
import { isEspaceSection, isMarcheSection, isTradeSection } from "@/lib/nav-section";

/**
 * Deux axes, et le second manquait.
 *
 * « Titres, Fonds, Marché » range par INSTRUMENT : c est le bon axe pour
 * choisir. Apres son premier achat un client pense par INTENTION, et rien ne
 * portait cet axe. L onglet qui le porte passe donc en tete pour qui est
 * connecte : on ne revient pas parcourir un catalogue, on revient agir.
 *
 * Il s appelait « Mon espace » ; il s appelle « Portefeuille » depuis que les
 * sieges ont remplace les sections, et le nom de l axe a suivi ce qu on y
 * trouve. Il ne parait pas a qui n est pas entre : un visiteur n a pas
 * d espace.
 */
/**
 * Ce qui découle du portefeuille, et qui n'est pas le portefeuille.
 *
 * Le relevé n'y est plus : il EST la page, depuis qu'il y est entré. « Mes
 * services » n'y est plus non plus : il est devenu Trader. Restent deux
 * lectures de ce qu'on possède.
 */
const TABS = [
  /**
   * DEUX ONGLETS, ET PAS SIX.
   *
   * La bande rangeait par TYPE D'INSTRUMENT : Titres, Fonds, Marché, Actualités.
   * C'est l'axe d'un catalogue, et il demande de savoir ce qu'on cherche avant
   * de servir. Un client se connecte pour deux choses, voir ce qu'il a et
   * traiter ; tout le reste est un moyen. « Titres » et « Fonds » occupaient
   * deux sièges pour deux façons d'acheter la même chose : ils tiennent
   * maintenant sous « Marché », en deux onglets de section, parce qu'un fonds
   * ne se lit pas comme une ligne mais s'achète au même endroit.
   *
   * Le Guide, les actualités et les services quittent la bande pour le menu du
   * compte : ce sont des destinations qu'on ouvre, pas des axes qu'on habite.
   */
  /* « ACCUEIL » PLUTÔT QUE « PORTEFEUILLE ». L'onglet pointait déjà la
     racine ; c'est son nom qui promettait moins qu'elle ne porte. Un
     portefeuille est un contenu, une page d'arrivée est une destination — et
     celle-ci porte aussi ce qui attend, la provision et les échéances. */
  { href: "/", label: "Accueil", match: isEspaceSection, connecte: true, pages: PORTEFEUILLE_PAGES },
  /**
   * TRADER, et c'est le siège qui manquait.
   *
   * Le portefeuille suppose qu'on possède déjà, le marché suppose qu'on sait
   * quel instrument on cherche. Personne ne répondait à « j'ai de l'argent,
   * qu'est-ce que je peux en faire », et les neuf services vivaient donc là où
   * l'on ne va pas chercher ce qu'on ne sait pas offert.
   *
   * Il n'ouvre aucun menu, et c'est ce qui fait sa force : les neuf tiennent
   * ensemble sur une page, chacun avec son état chiffré et ses étapes. En liste
   * déroulante ils se réduiraient à neuf noms, or un service nommé ne se lit
   * pas : c'est son état qui se lit.
   */
  /* IL OUVRE UN MENU DEPUIS LA FUSION, et c'est le seul point où la note
     ci-dessus a vieilli : les trois familles d'« Instruments » sont venues le
     rejoindre, et un siège qui contient des pages doit les nommer, sinon
     « /titres » vit sous un siège dont le menu l'ignore. Les neuf services
     tiennent toujours sur sa page, avec leur état et leurs étapes ; le menu
     ne porte que les destinations. */
  { href: "/trader", label: "Trade", match: isTradeSection, connecte: true, pages: TRADE_PAGES },
  // Le catalogue : les titres, les fonds, les adjudications, l'indice, les
  // sociétés, les analyses. La bande « Sur le même sujet » dit la même famille
  // au pied de chaque article, et les deux se lisent dans MARKET_PAGES.
  { href: "/marche", label: "Marché", connecte: true, match: isMarcheSection, pages: MARKET_PAGES },
  /* LES DEUX PAGES DE LA VITRINE, ET ELLES PASSENT DEVANT LE GUIDE : un
     visiteur vient savoir ce qu'on fait et à qui il a affaire, pas apprendre
     le vocabulaire. La maquette en portait quatre ; « Comment ça marche » et
     « Ce que vous pouvez faire » répondaient à une seule question posée en
     deux temps, et « Nous joindre » doublait le pied de page. */
  { href: "/placements", label: "Nos placements", match: (p: string) => p.startsWith("/placements"), visiteur: true },
  { href: "/a-propos", label: "À propos", match: (p: string) => p.startsWith("/a-propos"), visiteur: true },
  { href: "/info", label: "Guide", match: (p: string) => (p.startsWith("/info") && !p.startsWith("/info/risques")) || p.startsWith("/comparer"), visiteur: true },
  /* Les deux adresses qu'un visiteur peut lire en plus du guide. Elles ne
     paraissent qu'à lui : connecté, les publications vivent dans le menu
     « Marché » et les risques au pied de page. */
  { href: "/indice/notes", label: "Publications", match: (p: string) => p.startsWith("/indice/note"), visiteur: true },
  { href: "/info/risques", label: "Risques et limites", match: (p: string) => p.startsWith("/info/risques"), visiteur: true },
  { href: "/desk", label: "Desk", match: (p: string) => p.startsWith("/desk"), connecte: true },
];

/**
 * LE MENU NE DIT PLUS COMBIEN CHAQUE PAGE CONTIENT.
 *
 * Il posait « 45 » à gauche de « Titres », par « comptesParLieu ». Parti le
 * 29 octobre 2026 avec les comptes de la console : « ne plus annoncer le
 * nombre de lignes ou de services dans les intitulés ». Le laisser ici
 * aurait été le plus sûr moyen de le voir revenir là-bas — c'est la même
 * phrase, sur les mêmes trois familles, à deux surfaces de distance.
 *
 * LA LECTURE QUI L'ALIMENTAIT EST PARTIE AVEC LUI : le gabarit appelait
 * « listOffers » à chaque rendu de chaque page pour ce seul chiffre.
 */

/** `mode`: "client" hides the Desk tab (the desk has its own host), "desk" keeps only it, "all" is the one-host setup. */
export function NavTabs({ mode = "all", connecte = false }: { mode?: "all" | "client" | "desk"; connecte?: boolean }) {
  const path = usePathname();
  const t = useT();
  // Le menu retient la page sur laquelle il s'est ouvert : changer de page le referme
  // de lui-même, sans effet de bord. Sinon il resterait ouvert par-dessus la page
  // qu'il vient d'ouvrir.
  // Deux choses tiennent dans cet état : QUEL siège est ouvert, et SUR QUELLE
  // page il s'est ouvert. La seconde ferme le menu de lui-même quand on change
  // de page, sinon il resterait ouvert par-dessus la page qu'il vient d'ouvrir.
  const [openAt, setOpenAt] = useState<{ tab: string; path: string } | null>(null);
  const open = openAt && openAt.path === path ? openAt.tab : null;
  const setOpen = (tab: string | null) => setOpenAt(tab ? { tab, path } : null);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    /* « setOpenAt » et non « setOpen » : le second est recréé à chaque rendu
       et capture la page du rendu où l'écouteur a été posé. Fermer ne demande
       pas de page, et le poseur d'état, lui, est stable. */
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpenAt(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenAt(null);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  /* La bande dit ce que le lecteur peut ouvrir, et rien d'autre. Tout est
     derrière la porte sauf le guide, les publications et les risques : montrer
     « Titres » à un visiteur serait l'envoyer sur un mur de connexion. */
  const ouverts = TABS.filter((x) => (connecte ? !x.visiteur : !x.connecte));
  const tabs = mode === "client" ? ouverts.filter((x) => x.href !== "/desk") : mode === "desk" ? ouverts.filter((x) => x.href === "/desk") : ouverts;

  return (
    <nav className={styles.tabs} aria-label="Sections">
      {tabs.map((tab) => {
        const dedans = <>{t(tab.label)}</>;
        if (!tab.pages)
          return (
            <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={tab.match(path) ? "page" : undefined}>
              {dedans}
            </Link>
          );
        // Un seul menu ouvert à la fois : l'état retient QUEL siège est ouvert,
        // pas seulement qu'il y en a un. Avec un booléen, ouvrir Portefeuille
        // ouvrait aussi Marché.
        const ouvert = open === tab.href;
        return (
          <div key={tab.href} className={styles.group} ref={ouvert ? box : undefined}>
            {/* UN SIÈGE QUI PORTE UNE LISTE N'EST PLUS UN LIEN.
                Le nom ouvrait une page et le chevron ouvrait la liste : deux
                cibles collées, dont l'une de huit pixels, et le lecteur visait
                mal. Le siège ouvre sa liste, et l'ancienne racine en est le
                premier élément, nommée. */}
            <button
              type="button"
              className={`${styles.tab} ${styles.chev}`}
              aria-current={tab.match(path) ? "page" : undefined}
              aria-expanded={ouvert}
              aria-haspopup="true"
              onClick={() => setOpen(ouvert ? null : tab.href)}
            >
              {dedans}
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1 3.2 L5 7 L9 3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {ouvert && (
              <div className={styles.menu}>
                {tab.pages.map((p) => (
                  <Link key={p.key} href={p.href} className={styles.item}>
                    <b>{t(p.label)}</b>
                    <small>{t(p.hint)}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
