"use client";

import { useT } from "@/i18n/client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./Sheet.module.css";
import { useSheetPresence } from "./useSheetPresence";
import { deverrouiller, verrouiller } from "./verrou-defilement";
import { commencerLeGeste, relacherLaFeuille, suivreLeGeste, type Geste } from "./relacher";

/**
 * A sheet over the page: from the bottom on the phone (pulled down or
 * tapped beside to close), a small dialog in the middle on a desk. The page
 * keeps its scroll position underneath; that is the point of it. `tall`
 * fixes the sheet's height on the phone, so that switching tabs never moves
 * its edge; `foot` is a row that stays under the scrolling body.
 *
 * `dock` says which edge the sheet belongs to, and the rule is that a menu
 * opens from the edge its trigger sits nearest. A control on the tab bar
 * rises from the bottom; « top-right » drops from the header's right end;
 * « under », with `anchorTop`, drops from under a line frozen at the top of
 * the screen. A sheet that rises from the bottom when its trigger is frozen
 * at the top breaks the tie between the control and what it opened, and
 * covers the page from the wrong end.
 *
 * Deux menus font exception, et c’est voulu : le « ⋮ » et l’initiale du compte
 * se tiennent en haut à droite, tombent de leur déclencheur sur ordinateur, et
 * une requête média les renvoie en bas sur téléphone. Ils s’ouvrent des dizaines
 * de fois par jour, en bas de l’écran où se tient le pouce ; le principe les
 * désigne, la décision du 23 septembre 2026 est de ne pas y toucher.
 */
export function Sheet({ open, onClose, title, sub, children, wide, navy, dock, anchorTop, tabs, tall, plein, foot, action, centre }: { open: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode; wide?: boolean; navy?: boolean; dock?: "top-right" | "under" | "bottom-left"; /** avec dock « under » : le bas du déclencheur, mesuré à l'ouverture */ anchorTop?: number; tabs?: { key: string; label: React.ReactNode; on: boolean; pick: () => void }[]; tall?: boolean; /**
 * PLEINE PAGE À TOUTE LARGEUR, et la croix pour seule sortie.
 *
 * DEMANDÉ LE 29 OCTOBRE 2026 pour les « en bref » : « chaque en bref sera
 * sur une page complète avec sa croix pour refermer ». « tall » faisait
 * déjà cela, mais sur téléphone seulement — sur un écran large le brief
 * restait un panneau au coin, et un panneau se lit en diagonale. Un texte
 * qu'on veut voir lu occupe l'écran.
 *
 * Variante à part plutôt que « tall » élargi : le Guide emploie « tall » et
 * doit garder son panneau sur un écran large, où il sert de second volet à
 * côté de la page qu'on lit.
 */ plein?: boolean; foot?: React.ReactNode; /** un objet posé à droite du titre, avant la croix : un réglage qu'on veut en tête et non au fond */ action?: React.ReactNode; /** une fenêtre posée AU MILIEU de l'écran, sur téléphone aussi : un choix court, pas une feuille qui monte du bas */ centre?: boolean }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Geste | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { shown, visible } = useSheetPresence(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      /* UNE LISTE OUVERTE PREND L'ÉCHAP POUR ELLE. Les deux écoutent le
         document, et la feuille gagnait : le client qui écartait une liste
         déroulante perdait la feuille entière — et, dans un formulaire, tout ce
         qu'il venait d'y taper. Relevé à l'écran le 26 octobre 2026 dans le
         gabarit du sondage, le premier endroit de la maison où un Select vit
         dans une feuille. */
      if (document.querySelector("[data-liste-ouverte]")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    verrouiller();
    return () => {
      document.removeEventListener("keydown", onKey);
      deverrouiller();
    };
  }, [open, onClose]);
  if (!mounted || !shown) return null;
  /**
   * CE QUI FERME LA FEUILLE AU DOIGT.
   *
   * La règle d'avant : seul un tiré commencé sur la poignée ou le titre ferme,
   * le corps garde son défilement. Elle avait raison sur le fond et tort au
   * bord : arrivé en haut de son contenu, le lecteur continue de tirer, et
   * c'est exactement là qu'il veut fermer. Il obtenait un rafraîchissement de
   * page, qui ferme la feuille ET perd ce qu'il venait d'y cocher.
   *
   * Le tiré ferme donc aussi depuis le corps, À LA CONDITION que le corps soit
   * déjà en haut. Sinon il défile, comme avant : une feuille longue se lit.
   */
  const onTouchStart = (e: React.TouchEvent) => {
    /* LA FENÊTRE CENTRÉE SE FERME AUSSI D'UN GESTE DE HAUT EN BAS (6 novembre 2026), comme la feuille du bas : « Filtrer » et « Affichage » en sont. */
    const cible = e.target as HTMLElement;
    const corps = cible.closest(`.${styles.body}`);
    const surLaTete = Boolean(cible.closest(`.${styles.head}`));
    if (!surLaTete && corps && corps.scrollTop > 0) return;
    drag.current = commencerLeGeste(e.touches[0].clientY);
    box.current?.classList.add(styles.drag);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !box.current) return;
    // Une feuille tombée du haut se repousse vers le haut : le geste va toujours
    // vers le bord d'où elle est venue.
    const up = dock === "under";
    const dy = suivreLeGeste(drag.current, e.touches[0].clientY, up);
    box.current.style.transform = centre ? `translate(-50%, calc(-50% + ${dy}px))` : `translateY(${up ? -dy : dy}px)`;
  };
  const onTouchEnd = () => {
    const g = drag.current;
    drag.current = null;
    /* LA FERMETURE REPREND LÀ OÙ EST LE DOIGT (3A, 9 novembre 2026) : voir « relacher ». La feuille n'est plus remise en place avant de se fermer. */
    if (relacherLaFeuille(box.current, g, { haut: dock === "under", centre: Boolean(centre), classeDeGlissement: styles.drag })) onClose();
  };
  return createPortal(
    <>
      <div className={`${styles.scrim} ${visible ? styles.scrimOpen : ""}`} style={dock === "under" && anchorTop != null ? { top: anchorTop } : undefined} onClick={onClose} aria-hidden="true" />
      <div ref={box} className={`${styles.sheet} ${wide ? styles.wide : ""} ${navy ? styles.navy : ""} ${dock === "top-right" ? styles.dockTopRight : ""} ${dock === "bottom-left" ? styles.dockBottomLeft : ""} ${dock === "under" ? styles.dockUnder : ""} ${tall ? styles.tall : ""} ${plein ? styles.plein : ""} ${centre ? styles.centre : ""} ${visible ? styles.sheetOpen : ""}`} style={dock === "under" && anchorTop != null ? { top: anchorTop, maxHeight: `calc(100vh - ${anchorTop + 16}px)` } : undefined} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className={styles.head}>
          <div className={styles.grab} />
          <div className={styles.titleRow}>
            <b>
              {title}
              {sub && <small className={styles.sub}>{sub}</small>}
            </b>
            {action}
            <button type="button" className={styles.close} onClick={onClose} aria-label={t("Fermer")}>
              ×
            </button>
          </div>
          {tabs && (
            <div className={styles.tabs} role="tablist">
              {tabs.map((tb) => (
                <button key={tb.key} type="button" role="tab" aria-selected={tb.on} className={tb.on ? styles.tabOn : undefined} onClick={tb.pick}>
                  {tb.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.body}>{children}</div>
        {foot && <div className={styles.foot}>{foot}</div>}
      </div>
    </>,
    document.body,
  );
}
