"use client";

import { useT } from "@/i18n/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./FilterFab.module.css";

/**
 * Le bouton flottant des filtres : un rond en bas à gauche, qui paraît dès
 * que la barre de la liste est passée sous l'en-tête du site. Il vit sur le
 * « body » : la liste peut glisser sous un doigt, le bouton ne doit pas.
 *
 * IL NE MÈNE PAS TOUJOURS À UNE FEUILLE. Sur les titres et les adjudications
 * il ouvre la feuille des filtres ; sur les fonds, où tout est à plat et où
 * il n'y a plus de feuille, il RAMÈNE aux commandes, en haut. Dans les deux
 * cas il veut dire « les filtres », et il y conduit sous la forme qu'ils ont
 * à cet endroit. « ouvre » dit laquelle, parce qu'un lecteur d'écran ne doit
 * pas s'entendre annoncer une boîte de dialogue qui ne viendra pas.
 */
export function FilterFab({ watch, onClick, count, open, ouvre = true }: { watch: React.RefObject<HTMLElement | null>; onClick: () => void; count: number; open: boolean; ouvre?: boolean }) {
  const t = useT();
  const [gone, setGone] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    // The site header covers the top 60 px: the toolbar counts as gone once it is under it.
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.bottom < 60), { rootMargin: "-60px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);
  if (!mounted) return null;
  const on = gone && !open;
  const quoi = ouvre ? t("Filtrer et trier") : t("Revenir aux filtres");
  const label = count > 0 ? `${quoi} · ${count}` : quoi;
  return createPortal(
    <button type="button" className={`${styles.fab} ${on ? styles.on : ""}`} onClick={onClick} aria-haspopup={ouvre ? "dialog" : undefined} aria-hidden={!on} tabIndex={on ? 0 : -1} aria-label={label} title={label}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>,
    document.body,
  );
}
