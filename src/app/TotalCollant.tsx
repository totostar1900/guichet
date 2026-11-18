"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./TotalCollant.module.css";

/**
 * LE TITRE SE REPLIE EN BARRE (18 novembre 2026, planche « Statuts et dynamisme », 2B) : quand le portefeuille a quitté l'écran en défilant, son total reste en vue sous la barre du haut.
 * Il paraît quand la grande carte est sortie par le haut, et se retire quand elle revient. Téléphone seulement : sur grand écran la carte reste à l'écran.
 */
export function TotalCollant({ total, variation }: { total: string; variation?: string }) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting && e.boundingClientRect.bottom < 0), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`${styles.barre} ${visible ? styles.visible : ""}`} aria-hidden={!visible}>
      <span>{t("Mon portefeuille")}</span>
      <b>{total}</b>
      {variation && <small>{variation}</small>}
    </div>
  );
}
