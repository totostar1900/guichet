"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { Sheet } from "./Sheet";
import { MARKET_PAGES, currentMarketPage } from "@/lib/market/pages";
import styles from "./MarketFab.module.css";

/**
 * LES PAGES VOISINES DU MARCHÉ, SOUS UN BOUTON QUI NE PREND RIEN.
 *
 * ─── Ce qu'il remplace, et pourquoi ────────────────────────────────────────
 *
 * Un bandeau de pastilles — « Vue d'ensemble · L'indice · Les sociétés
 * cotées · … » — ouvrait chaque page du marché sur le téléphone. Il n'était
 * pas figé, mais il occupait la première bande de l'écran, celle où l'on
 * cherche le titre de la page qu'on vient d'ouvrir ; et sur sept pastilles,
 * deux se voyaient à la fois, dont la plus inutile de toutes, celle qui
 * marque la page où l'on se tient déjà.
 *
 * Demande du dirigeant, 1er novembre 2026 : « un bouton flottant qui liste
 * les pages adjacentes, pour que l'utilisateur n'ait pas à revenir à la page
 * Marché pour naviguer ». Les six pages de la famille le reçoivent ensemble :
 * une page qui navigue autrement que ses cinq sœurs est la divergence que
 * cette maison paie le plus cher.
 *
 * ─── Ce qu'il ne fait pas ──────────────────────────────────────────────────
 *
 * IL NE PORTE PAS LES SECTIONS DE LA PAGE. « Sur cette page » reste ce qu'il
 * est, là où il est : un sommaire sert à se déplacer DANS un article, ce
 * bouton sert à en changer. Les mêler ferait une liste où « Composition » et
 * « Les sociétés cotées » se ressemblent sans mener au même genre d'endroit.
 *
 * IL PARAÎT AUSSI SUR LA PORTE, et c'est ce qui le distingue du bandeau qu'il
 * remplace. Le bandeau se taisait sur « /marche » PARCE QUE la page y posait
 * un sommaire des six entrées, au-dessus de son propre titre. Ce sommaire est
 * parti le même jour : il redisait en tuiles muettes ce que les sections
 * disent avec un chiffre.
 *
 * Les sections suffisent-elles ? Presque, et c'est le presque qui compte. Un
 * jour sans bulletin, sans ligne au catalogue et sans dépêche publiée — l'état
 * du dépôt mémoire, et celui d'un lundi creux — la porte ne rend plus que les
 * notes et l'éclairage : l'indice, les sociétés, la comparaison et les
 * actualités n'ont alors aucune entrée sur un écran étroit. Un cliquet avait
 * écrit ce risque mot pour mot avant qu'on y touche : « retirer le sommaire
 * sans rendre le rail laisserait le téléphone sans aucune entrée vers la
 * famille ». Le bouton le rend, partout, et il tient dans trente-quatre
 * pixels au lieu de sept cents.
 *
 * ─── Ce qu'il doit au coin où il se pose ───────────────────────────────────
 *
 * EN BAS À GAUCHE, et c'est la place du bouton flottant de cette maison —
 * celle des filtres. Aucune page du marché n'en porte, donc le coin est
 * libre ; « Haut de page » tient le coin droit, et les deux ne se croisent
 * jamais. Il vit sur le « body » par un portail : la page peut glisser sous
 * un doigt, le bouton ne doit pas.
 *
 * ET IL EST LÀ DÈS LE PREMIER PIXEL, contrairement au bouton des filtres qui
 * attend que sa barre soit passée. Celui-ci REMPLACE une navigation qui
 * s'offrait en haut : s'il ne paraissait qu'après avoir descendu la page,
 * l'écran d'arrivée n'en aurait aucune.
 */
export function MarketFab() {
  const path = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);
  /* Le portail attend le navigateur : au serveur il n'y a pas de « body », et
     rendre le bouton dans le flux puis le déplacer serait une discordance
     d'hydratation de plus. */
  const monte = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const ici = currentMarketPage(path);
  if (!monte || !ici) return null;
  /* La page où l'on se tient n'est pas une entrée : sur la porte, cela retire
     « Le marché » et laisse les six autres ; ailleurs, cela retire celle
     qu'on lit. Une pastille qui marque l'endroit où l'on est déjà était la
     plus inutile des sept du bandeau. */
  const voisines = MARKET_PAGES.filter((p) => p.key !== ici);
  return createPortal(
    <>
      <button type="button" className={styles.fab} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={t("Les pages du marché")} title={t("Les pages du marché")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("Les pages du marché")} dock="bottom-left">
        <nav className={styles.liste} aria-label={t("Les pages du marché")}>
          {voisines.map((p) => (
            <Link key={p.key} href={p.href} onClick={() => setOpen(false)}>
              <b>{t(p.label)}</b>
              {/* CE QU'ON Y TROUVE, ET NON LE SEUL NOM. Les pastilles n'avaient
                  la place que d'un nom abrégé — « L'éclairage », « Les notes » —
                  et un nom abrégé ne dit pas ce qu'on ouvre. La feuille a la
                  largeur de la phrase. */}
              <span>{t(p.hint)}</span>
            </Link>
          ))}
        </nav>
      </Sheet>
    </>,
    document.body,
  );
}
