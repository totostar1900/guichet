"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cibleEnHaut, defilerVers, fautRevenirEnHaut, repere, restituer, type Repere } from "@/lib/ui/garder-la-place";
import styles from "./FichePanes.module.css";

/**
 * On a phone the fiche is read in four compartments: Essentiel, Chiffres,
 * Documents, Émetteur. Sections carry `data-pane`; this wrapper shows one pane
 * at a time under 760 px and everything above (CSS does the hiding, so the
 * desktop page is untouched and the HTML is the same for both).
 */
export const PANES: [string, string][] = [
  ["essentiel", "Essentiel"], // translated at render
  ["chiffres", "Chiffres"],
  ["calendrier", "Calendrier"], // seulement quand la ligne en documente un : voir « FicheSegments »
  ["docs", "Documents"],
  ["emetteur", "Émetteur"],
];

const PaneCtx = createContext<{ pane: string; setPane: (p: string) => void; sans: string[] }>({ pane: "essentiel", setPane: () => undefined, sans: [] });

export function FichePanes({ children, className, sans = [], depart = "essentiel" }: { children: React.ReactNode; className?: string; /** Les volets que cette fiche ne montre pas (voir « fiche-volets »). */ sans?: string[]; /** Le volet ouvert au départ : « marche » pour la page d'une société (6 novembre 2026). */ depart?: string }) {
  const [pane, setPane] = useState(depart);
  const racine = useRef<HTMLDivElement>(null);
  const avant = useRef<Repere | null>(null);
  const barre = () => racine.current?.querySelector('[role="tablist"]') ?? null;
  /* GARDER LA PLACE : la barre d'onglets est ce que le doigt vient de toucher, elle ne bouge pas quand le volet change de hauteur (voir « garder-la-place »). */
  const choisir = (p: string) => {
    avant.current = repere(barre());
    setPane(p);
  };
  useLayoutEffect(() => {
    const m = avant.current;
    avant.current = null;
    /* PAGE DÉFILÉE (la bande est collée) : on revient en HAUT du nouvel onglet, sous la bande. Sinon, la barre garde sa place (« garder la place »). */
    const bande = barre()?.parentElement;
    const premiere = racine.current ? Array.from(racine.current.querySelectorAll<HTMLElement>("[data-pane]")).find((e) => e.offsetParent !== null) : undefined;
    if (m && bande && bande.offsetHeight > 0 && premiere) {
      const collage = parseFloat(getComputedStyle(bande).top) || 0;
      const ecart = parseFloat(getComputedStyle(racine.current as HTMLElement).getPropertyValue("--chapitres-gap")) || 0;
      const cible = cibleEnHaut(premiere.getBoundingClientRect().top + window.scrollY, collage, bande.offsetHeight, ecart);
      if (fautRevenirEnHaut(m.scrollY, cible)) {
        defilerVers(cible, racine.current);
        return;
      }
    }
    restituer(m, barre(), racine.current);
  }, [pane]);
  return (
    <PaneCtx.Provider value={{ pane, setPane: choisir, sans }}>
      <div ref={racine} className={`${styles.panes} ${className ?? ""}`} data-show={pane}>
        {children}
      </div>
    </PaneCtx.Provider>
  );
}

/**
 * LA BANDE DE MENU DE LA FICHE (7 novembre 2026, choix 1A · 2C · 3B de la planche).
 *
 * Des onglets soulignés, bord à bord, sur un fond opaque : le segment arrondi laissait lire le texte de la carte à travers ses coins quand il collait.
 * « Calendrier » n'est un onglet que lorsque la ligne en documente un (« exclure » le retire sinon) ; il n'y a pas d'onglet « Risques », ils restent au pied
 * de la page. COLLÉE, la bande montre au-dessus des onglets le nom court de la ligne et son chiffre en avant : la tête de la fiche a défilé, on sait encore
 * laquelle on lit.
 */
export function FicheSegments({ exclure = [], mini, libelles = {}, volets = PANES }: { /** Les onglets de la page, quand ce ne sont pas ceux d'une fiche de ligne : « Marché · Comptes · Ratios · Société » pour une société cotée. */ volets?: [string, string][]; exclure?: string[]; mini?: { nom: string; chiffre: string; sous?: string }; /** Le nom d'un onglet propre à la ligne : « Société de gestion » pour un fonds, à la place de « Émetteur » (10 novembre 2026). */ libelles?: Record<string, string> }) {
  const { pane, setPane, sans } = useContext(PaneCtx);
  const t = useT();
  const bande = useRef<HTMLDivElement>(null);
  const [colle, setColle] = useState(false);
  useEffect(() => {
    const el = bande.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    /* COLLÉE = rognée d'un pixel par la marge haute de l'observateur (la bande colle à 52 px) : pas d'élément témoin, qui serait un enfant de plus de la pile et lui ajouterait un écart. */
    const o = new IntersectionObserver(([e]) => setColle(e.intersectionRatio < 1 && e.boundingClientRect.top <= 53), { rootMargin: "-53px 0px 0px 0px", threshold: [1] });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return (
    <>
      <div ref={bande} className={`${styles.bande} ${colle ? styles.colle : ""}`}>
        {mini && (
          <div className={styles.mini} aria-hidden="true">
            <b>{mini.nom}</b>
            <span>
              {mini.chiffre}
              {mini.sous && <i>{mini.sous}</i>}
            </span>
          </div>
        )}
        <div className={styles.seg} role="tablist" aria-label={t("Sections de la fiche")}>
          {volets.filter(([k]) => !sans.includes(k) && !exclure.includes(k)).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={pane === k} className={pane === k ? styles.on : undefined} onClick={() => setPane(k)}>
              {t(libelles[k] ?? label)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Phone-only bar above the tab bar: the one action, always a thumb away. It
 * opens the intention on its own page.
 *
 * ELLE EST FLOTTANTE, DONC ELLE MANGE LA FIN DE LA PAGE — et c'est ce qui a
 * été signalé le 28 octobre 2026 : « le bouton Passer un ordre cache la
 * section Cotation et règlement ». Mesuré avant correction, page défilée à
 * fond sur un écran de 844 px : la dernière section allait de 566 à 759, la
 * barre de 724 à 788. TRENTE-CINQ PIXELS de la section étaient sous le bouton,
 * et aucun geste ne pouvait les atteindre — la page ne défile pas plus loin.
 *
 * LA CALE EST DANS LE FLUX, elle, et elle naît avec la barre : la réserve
 * existe donc exactement quand il y a quelque chose à réserver, et une ligne
 * close — qui n'a pas de barre — ne gagne pas un trou blanc. Les deux lisent
 * la même hauteur, écrite une fois.
 */
export function StickyAction({ label, href, secondaryHref, secondaryLabel }: { label: string; href: string; secondaryHref?: string; secondaryLabel?: string }) {
  return (
    <>
    <div className={styles.cale} aria-hidden="true" />
    <div className={styles.cta} data-coach="action">
      {/* Il n'était qu'un « ghost » de petite taille à côté d'une action pleine
          hauteur : il se lisait comme une note de bas de page. Même hauteur et un
          contour franc, l'action gardant le poids. */}
      {secondaryHref && (
        <a className={`btn ${styles.ctaSecond}`} href={secondaryHref}>
          {secondaryLabel}
        </a>
      )}
      <Link className={`btn primary ${styles.ctaMain}`} href={href}>
        {label}
      </Link>
    </div>
    </>
  );
}
