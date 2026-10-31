"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { estFavori, basculerFavori } from "@/app/favoris/actions";
import { logout } from "@/app/connexion/actions";
import { useLang, useT } from "@/i18n/client";
import { cheminDeFavori } from "@/lib/domain/favoris";
import type { Attente } from "@/lib/domain/services";
import { LangSwitch } from "../LangSwitch";
import { PaletteSwitch } from "../PaletteSwitch";
import { MenuRecherche, useGuideIndex } from "../menu/Pieces";
import { ListeAttentes, useBrouillon } from "./Attentes";
import { titreDeLOnglet } from "./titre-onglet";
import { Sheet } from "./Sheet";
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
  name: string;
  attentes: Attente[];
  /** Lignes qui ferment sous sept jours : le nombre de l'horloge. */
  urgentes: number;
}

const ICONE = {
  horloge: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2",
  etoile: "M12 3.3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.6l-5.5 2.9 1-6.2L3 9.9l6.2-.9z",
  cloche: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4",
  ordres: "M5 4h10l4 4v12H5zM9 12h6M9 16h6",
  documents: "M4 6h16v12H4zM4 10h16",
  compte: "M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM4 21c0-4 4-7 8-7s8 3 8 7",
  aide: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5M12 17h.01",
  langue: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  sortie: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9",
  loupe: "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM16 16l4 4",
};
function Trace({ d, plein }: { d: string; plein?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-plein={plein ? "oui" : undefined}>
      <path d={d} />
    </svg>
  );
}

export function BarreDuHaut({ name, attentes, urgentes }: BarreDuHautProps) {
  const t = useT();
  const lang = useLang();
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [cherche, setCherche] = useState(false);
  const [attendu, setAttendu] = useState(false);
  const [favori, setFavori] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const { index } = useGuideIndex(cherche);
  const brouillon = useBrouillon();
  const combien = attentes.length + (brouillon ? 1 : 0);
  const { shown, visible } = useSheetPresence(ouvert);
  const croix = useRef<HTMLButtonElement>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const fermer = () => setOuvert(false);

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
      <Link href="/echeances" className={`${styles.ic} ${styles.ambre}`} aria-label={urgentes > 0 ? t("Ce qui ferme bientôt · {n} sous sept jours", { n: String(urgentes) }) : t("Ce qui ferme bientôt")} title={t("Ce qui ferme bientôt")}>
        <Trace d={ICONE.horloge} />
        {urgentes > 0 && <em className={`${styles.pas} ${styles.pasAmbre}`}>{urgentes > 9 ? "9+" : urgentes}</em>}
      </Link>
      <Link href="/favoris" className={`${styles.ic} ${styles.or}`} aria-label={t("Mes favoris")} title={t("Mes favoris")}>
        <Trace d={ICONE.etoile} />
      </Link>
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
            <aside className={`${styles.tiroir} ${visible ? styles.tiroirOuvert : ""}`} role="dialog" aria-modal="true" aria-label={t("Menu")} aria-hidden={!ouvert}>
              <div className={styles.haut}>
                <Link href="/moi/compte" className={styles.identite} onClick={fermer}>
                  <span className={styles.init}>{initial}</span>
                  <span>
                    <b>{name}</b>
                    <small>{t("Votre compte")}</small>
                  </span>
                </Link>
                <button ref={croix} type="button" className={styles.fermer} onClick={fermer} aria-label={t("Fermer")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div className={styles.corps}>
                <button type="button" className={styles.champ} onClick={() => setCherche(true)} aria-haspopup="dialog">
                  <Trace d={ICONE.loupe} />
                  {t("Chercher une page, une réponse")}
                </button>

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
                <Link href="/echeances" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.horloge} />
                  <span>{t("Ce qui ferme bientôt")}</span>
                  {urgentes > 0 && <em className={`${styles.nb} ${styles.nbAmbre}`}>{urgentes}</em>}
                </Link>
                <Link href="/favoris" className={styles.ligne} onClick={fermer}>
                  <Trace d={ICONE.etoile} />
                  <span>{t("Mes favoris")}</span>
                </Link>
                {rangeable && favori !== null && (
                  <button
                    type="button"
                    className={`${styles.ligne} ${styles.sous}`}
                    disabled={pending}
                    aria-pressed={favori}
                    onClick={() =>
                      start(async () => {
                        const r = await basculerFavori(ici, titreDeLOnglet(), !favori);
                        if (r.ok) setFavori(r.favori);
                      })
                    }
                  >
                    <Trace d={ICONE.etoile} plein={favori} />
                    <span>{favori ? t("Retirer cette page des favoris") : t("Mettre cette page en favori")}</span>
                  </button>
                )}

                <div className={styles.rub}>{t("Mon dossier")}</div>
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
                  <span>{t("Aide et contact")}</span>
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

      {chemin !== "/recherche" && (
        <Sheet open={cherche} onClose={() => setCherche(false)} navy tall dock="top-right" title={t("Rechercher")}>
          <MenuRecherche index={index} close={() => { setCherche(false); fermer(); }} />
          <Link className={styles.tout} href="/recherche" onClick={() => { setCherche(false); fermer(); }}>
            {t("Ouvrir la recherche entière")} →
          </Link>
        </Sheet>
      )}
    </>
  );
}
