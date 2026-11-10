"use client";

import { EnBrefInstruments, type Instrument } from "@/components/EnBrefInstruments";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { estFavori, basculerFavori } from "@/app/favoris/actions";
import { logout } from "@/app/connexion/actions";
import { useLang, useT } from "@/i18n/client";
import { cheminDeFavori } from "@/lib/domain/favoris";
import { estRacine } from "@/lib/nav-profondeur";
import type { Attente } from "@/lib/domain/services";
import { LangSwitch } from "../LangSwitch";
import { PaletteSwitch } from "../PaletteSwitch";
import { ListeAttentes, useBrouillon } from "./Attentes";
import { titreDeLOnglet } from "./titre-onglet";
import { COURBE_DES_FEUILLES } from "./relacher";
import { useSheetPresence } from "./useSheetPresence";
import { deverrouiller, verrouiller } from "./verrou-defilement";
import styles from "./BarreDuHaut.module.css";

/**
 * LE COIN DROIT DE LA BARRE, POUR UN CLIENT : L'HORLOGE, L'ÉTOILE, LE MENU.
 *
 * Décidé le 31 octobre 2026, sur maquette. La barre portait quatre objets
 * (cloche, loupe, initiale, et un « ⋮ » absent) ; ajouter les deux raccourcis
 * qu'on répète — ce qui ferme bientôt, ce qu'on a gardé — en aurait fait six
 * cibles de 40 px et plus de place pour dire où l'on est. Trois cibles, donc :
 *
 *   L'HORLOGE mène à la page des lignes qui ferment ; sa pastille ambre compte
 *   celles qui ferment sous sept jours, et rien en dessous de un.
 *   L'ÉTOILE mène aux favoris : les lignes suivies et les pages rangées.
 *   LES TROIS BARRES ouvrent le menu, et leur pastille rouge compte ce qui
 *   attend le client — ce que la cloche comptait, au même nombre.
 *
 * Cloche, loupe et initiale sont passées dans le menu. La loupe y garde sa
 * feuille de six résultats (« une recherche se fait là où l'on est »).
 *
 * LE MENU EST UN TIROIR À DROITE, pas une feuille du bas : la page reste lisible
 * derrière, voilée, et il se ferme au voile, à la croix ou à Échap.
 *
 * LE DESK N'A PAS CETTE BARRE : il garde « BarreDuCompte » et son lien « Desk ».
 */
export interface BarreDuHautProps {
  attentes: Attente[];
  /** Les lignes que la page « Ce qui ferme bientôt » liste : le nombre de l'horloge. Sans aucune, l'horloge n'existe pas (10 novembre 2026). */
  echeances: number;
  /** Le client a au moins un favori : sans, l'étoile n'existe pas (1er novembre 2026). */
  favoris: boolean;
}

const ICONE = {
  horloge: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2",
  etoile: "M12 3.3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.6l-5.5 2.9 1-6.2L3 9.9l6.2-.9z",
  cloche: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4",
  ordres: "M5 4h10l4 4v12H5zM9 12h6M9 16h6",
  documents: "M4 6h16v12H4zM4 10h16",
  compte: "M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM4 21c0-4 4-7 8-7s8 3 8 7",
  contact: "M3 6h18v12H3zM3.5 7l8.5 6 8.5-6",
  aide: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5M12 17h.01",
  langue: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  sortie: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9",
  activite: "M3 12h4l3-7 4 14 3-7h4",
  loupe: "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM16 16l4 4",
};
/** Les trois pages d'Instruments, et le brief que chacune porte. */
const BRIEF_DE_LA_PAGE: Record<string, Instrument> = { "/titres": "titres", "/fonds": "fonds", "/calendrier": "adjudications" };

function Trace({ d, plein }: { d: string; plein?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-plein={plein ? "oui" : undefined}>
      <path d={d} />
    </svg>
  );
}

export function BarreDuHaut({ attentes, echeances, favoris }: BarreDuHautProps) {
  const t = useT();
  const lang = useLang();
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  /* L'étoile paraît dès que le client a un favori — et dès qu'il en pose un depuis le menu, sans recharger. */
  const [aUnFavori, setAUnFavori] = useState(favoris);
  const [attendu, setAttendu] = useState(false);
  const [favori, setFavori] = useState<boolean | null>(null);
  /* LES DEUX GROUPES DE LA BARRE, SELON LA PROFONDEUR (10 novembre 2026, option A) : sur une racine, les raccourcis globaux (horloge, étoile des favoris, loupe, « i ») ; dans une page, ceux de la page (son favori, le suivi d'une ligne), et le menu ne bouge pas. Chaque groupe glisse vers le bord en se repliant, l'autre en sort. */
  const racine = estRacine(chemin);
  const rangeablePage = !racine && Boolean(cheminDeFavori(chemin));
  const [favoriPage, setFavoriPage] = useState<boolean | null>(null);
  const [pendantPage, startPage] = useTransition();
  useEffect(() => {
    let vivant = true;
    if (rangeablePage) void estFavori(`${window.location.pathname}${window.location.search}`).then((v) => vivant && setFavoriPage(v));
    else queueMicrotask(() => vivant && setFavoriPage(null));
    return () => {
      vivant = false;
    };
  }, [chemin, rangeablePage]);
  const [pending, start] = useTransition();
  const brouillon = useBrouillon();
  const combien = attentes.length + (brouillon ? 1 : 0);
  const { shown, visible } = useSheetPresence(ouvert);
  const croix = useRef<HTMLButtonElement>(null);
  const fermer = () => setOuvert(false);
  /* LE TIROIR SE FERME D'UN GLISSEMENT VERS LA DROITE, SANS REBOND (10 novembre 2026). Il suit le doigt, puis, au relâchement, REPREND LÀ OÙ IL EST et glisse vers le bord d'où il est venu, à la courbe des feuilles (qui ne dépasse jamais) ; un glissement trop court le ramène à sa place par la même courbe. Le geste ne commence que s'il est plutôt horizontal : le défilement vertical de la liste reste libre. */
  const tiroir = useRef<HTMLElement>(null);
  const doigt = useRef<{ x0: number; y0: number; x: number; t: number; v: number; dx: number; en: boolean } | null>(null);
  const commencer = (e: React.TouchEvent) => {
    const p = e.touches[0];
    doigt.current = { x0: p.clientX, y0: p.clientY, x: p.clientX, t: performance.now(), v: 0, dx: 0, en: false };
  };
  const suivre = (e: React.TouchEvent) => {
    const g = doigt.current;
    const el = tiroir.current;
    if (!g || !el) return;
    const p = e.touches[0];
    const dx = p.clientX - g.x0;
    const dy = p.clientY - g.y0;
    if (!g.en) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        doigt.current = null;
        return;
      }
      if (dx > 10 && dx > Math.abs(dy) * 1.3) g.en = true;
      else return;
    }
    const now = performance.now();
    g.v = (p.clientX - g.x) / Math.max(1, now - g.t);
    g.x = p.clientX;
    g.t = now;
    g.dx = Math.max(0, dx);
    el.style.transition = "none";
    el.style.transform = `translateX(${g.dx}px)`;
  };
  const relacher = () => {
    const g = doigt.current;
    const el = tiroir.current;
    doigt.current = null;
    if (!g || !g.en || !el) return;
    if (g.dx > 80 || g.v > 0.5) {
      const reste = Math.max(40, el.offsetWidth - g.dx);
      const ms = Math.round(Math.min(300, Math.max(160, reste / Math.max(0.6, g.v || 1))));
      el.style.transition = `transform ${ms}ms ${COURBE_DES_FEUILLES}`;
      el.style.transform = "translateX(105%)";
      setOuvert(false);
      return;
    }
    el.style.transition = `transform 0.3s ${COURBE_DES_FEUILLES}`;
    el.style.transform = "";
    window.setTimeout(() => {
      el.style.transition = "";
    }, 320);
  };

  /* Le tiroir s'ouvre : défilement verrouillé, Échap ferme, la croix reçoit le
     focus, et on lit si CETTE page est déjà un favori — lu, jamais deviné. */
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[data-liste-ouverte]")) setOuvert(false);
    };
    document.addEventListener("keydown", onKey);
    verrouiller();
    croix.current?.focus();
    let vivant = true;
    const ici = `${window.location.pathname}${window.location.search}`;
    if (cheminDeFavori(ici)) void estFavori(ici).then((v) => vivant && setFavori(v));
    return () => {
      vivant = false;
      document.removeEventListener("keydown", onKey);
      deverrouiller();
    };
  }, [ouvert]);
  /* Un changement de page ferme le tiroir : on a suivi un lien. */
  useEffect(() => {
    const a = window.setTimeout(() => setOuvert(false), 0);
    return () => window.clearTimeout(a);
  }, [chemin]);

  const ici = typeof window === "undefined" ? chemin : `${window.location.pathname}${window.location.search}`;
  const rangeable = Boolean(cheminDeFavori(ici));
  const pastille = combien > 9 ? "9+" : String(combien);
  const libelleMenu = combien > 0 ? t("Menu · {n} en attente", { n: String(combien) }) : t("Menu");

  return (
    <>
      {/* LE « i » DES TROIS PAGES D'INSTRUMENTS EST DANS LA BARRE (4 novembre 2026, choix 1A) ET À GAUCHE DU GROUPE (7 novembre 2026) : en tête de rangée, avec son filet à droite, il se lit comme l'explication de la page et non comme une commande de plus entre l'horloge et la loupe : sans grand titre, il n'a plus de « face » où se poser, et il suit la page quand on défile. */}
      <div className={styles.groupe} data-racine={racine ? "oui" : "non"} inert={!racine}>
      {BRIEF_DE_LA_PAGE[chemin] && <EnBrefInstruments page={BRIEF_DE_LA_PAGE[chemin]} className={`${styles.ic} ${styles.info}`} />}
      {echeances > 0 && (
        <Link href="/echeances" className={`${styles.ic} ${styles.ambre}`} aria-label={t("Ce qui ferme bientôt · {n} à venir", { n: String(echeances) })} title={t("Ce qui ferme bientôt")}>
          <Trace d={ICONE.horloge} />
          <em className={`${styles.pas} ${styles.pasAmbre}`}>{echeances > 9 ? "9+" : echeances}</em>
        </Link>
      )}
      {aUnFavori && (
        <Link href="/favoris" className={`${styles.ic} ${styles.or}`} aria-label={t("Mes favoris")} title={t("Mes favoris")}>
          <Trace d={ICONE.etoile} />
        </Link>
      )}
      {/* LA RECHERCHE EST UN LIEN, PAS UNE BARRE (1er novembre 2026). Le champ du tiroir ouvrait une feuille de six résultats qui se comportait mal ; la page de recherche sait déjà chercher. La loupe y mène d'un geste, de toutes les pages sauf d'elle-même. */}
      {chemin !== "/recherche" && (
        <Link href="/recherche" className={styles.ic} aria-label={t("Rechercher")} title={t("Rechercher")}>
          <Trace d={ICONE.loupe} />
        </Link>
      )}
      </div>
      {/* LES BOUTONS DE LA PAGE : son favori, et ce que la page y pose (« DansLaBarre »). */}
      <div className={styles.groupe} data-contexte data-racine={racine ? "oui" : "non"} inert={racine}>
        {rangeablePage && favoriPage !== null && (
          <button
            type="button"
            className={`${styles.ic} ${styles.or}`}
            disabled={pendantPage}
            aria-pressed={favoriPage}
            aria-label={favoriPage ? t("Retirer cette page des favoris") : t("Mettre cette page en favori")}
            onClick={() =>
              startPage(async () => {
                const ici = `${window.location.pathname}${window.location.search}`;
                const r = await basculerFavori(ici, titreDeLOnglet(), !favoriPage);
                if (r.ok) {
                  setFavoriPage(r.favori);
                  if (r.favori) setAUnFavori(true);
                }
              })
            }
          >
            <Trace d={ICONE.etoile} plein={favoriPage} />
          </button>
        )}
        <span data-barre-contextuelle className={styles.slot} />
      </div>
      <button type="button" className={styles.ic} onClick={() => setOuvert(true)} aria-haspopup="dialog" aria-expanded={ouvert} aria-label={libelleMenu} title={t("Menu")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        {combien > 0 && <em className={styles.pas}>{pastille}</em>}
      </button>

      {shown &&
        createPortal(
          <>
            <div className={`${styles.voile} ${visible ? styles.voileOuvert : ""}`} onClick={fermer} aria-hidden="true" />
            <aside ref={tiroir} className={`${styles.tiroir} ${visible ? styles.tiroirOuvert : ""}`} role="dialog" aria-modal="true" aria-label={t("Menu")} aria-hidden={!ouvert} onTouchStart={commencer} onTouchMove={suivre} onTouchEnd={relacher} onTouchCancel={relacher}>
              <div className={styles.haut}>
                <button ref={croix} type="button" className={styles.fermer} onClick={fermer} aria-label={t("Fermer")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div className={styles.corps}>
                <button type="button" className={`${styles.ligne} ${combien > 0 ? styles.chaud : ""}`} aria-expanded={attendu} onClick={() => setAttendu(!attendu)} disabled={combien === 0}>
                  <Trace d={ICONE.cloche} />
                  <span>{t("Ce qui m'attend")}</span>
                  {combien > 0 && <em className={`${styles.nb} ${styles.nbRouge}`}>{combien}</em>}
                </button>
                {attendu && combien > 0 && (
                  <div className={styles.attentes}>
                    <ListeAttentes attentes={attentes} brouillon={brouillon} fermer={fermer} />
                  </div>
                )}
                {/* LE LIEN RESTE DANS LE MENU, QUELLE QUE SOIT LA PAGE (10 novembre 2026) : seule l'icône de la barre disparaît quand sa page est vide ; la porte du menu, elle, ne bouge pas. */}
                <Link href="/echeances" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.horloge} />
                  <span>{t("Ce qui ferme bientôt")}</span>
                  {echeances > 0 && <em className={`${styles.nb} ${styles.nbAmbre}`}>{echeances}</em>}
                </Link>
                {/* UN SEUL NIVEAU DE FAVORIS DANS LE MENU (décidé le 31 octobre 2026). Il y avait
                    « Mes favoris » ET « Mettre cette page en favori » : deux lignes pour le même
                    sujet, dont l'une redoublait l'étoile de la barre. L'étoile ouvre la liste ;
                    le menu ne porte que le geste qu'on ne peut faire qu'ici, sur la page courante. */}
                {rangeable && (
                  <button
                    type="button"
                    className={styles.ligne}
                    disabled={pending || favori === null}
                    aria-pressed={favori === true}
                    onClick={() =>
                      start(async () => {
                        const r = await basculerFavori(ici, titreDeLOnglet(), favori !== true);
                        if (r.ok) {
                          setFavori(r.favori);
                          if (r.favori) setAUnFavori(true);
                        }
                      })
                    }
                  >
                    <Trace d={ICONE.etoile} plein={favori === true} />
                    <span>{favori === true ? t("Retirer cette page des favoris") : t("Mettre cette page en favori")}</span>
                  </button>
                )}

                <div className={styles.rub}>{t("Mon dossier")}</div>
                {/* « MON ACTIVITÉ » RASSEMBLE CE QUE « PLUS » OUVRAIT À L'ACCUEIL (10 novembre 2026) : ordres, sondages, coupons, rentabilité, provision, versements, prélèvements, documents. */}
                <Link href="/trader" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.activite} />
                  <span>{t("Mon activité")}</span>
                </Link>
                <Link href="/moi/ordres" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.ordres} />
                  <span>{t("Mes ordres")}</span>
                </Link>
                <Link href="/moi/documents" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.documents} />
                  <span>{t("Mes documents")}</span>
                </Link>
                <Link href="/moi/compte" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.compte} />
                  <span>{t("Mon compte")}</span>
                </Link>

                <div className={styles.rub}>{t("Besoin d'aide")}</div>
                <Link href="/aide" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.aide} />
                  <span>{t("Aide")}</span>
                </Link>
                <Link href="/moi/contact" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.contact} />
                  <span>{t("Nous contacter")}</span>
                </Link>

                <div className={styles.rub}>{t("Réglages")}</div>
                <div className={styles.ligne}>
                  <Trace d={ICONE.langue} />
                  <span>{t("Langue")}</span>
                  <LangSwitch compact />
                </div>
                <div className={styles.palette}>
                  <PaletteSwitch lang={lang} />
                </div>
                <form action={logout}>
                  <button type="submit" className={`${styles.ligne} ${styles.sortie}`}>
                    <Trace d={ICONE.sortie} />
                    <span>{t("Se déconnecter")}</span>
                  </button>
                </form>
              </div>
            </aside>
          </>,
          document.body,
        )}

    </>
  );
}
