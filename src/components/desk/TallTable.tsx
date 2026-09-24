"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import styles from "./TallTable.module.css";

/**
 * Un tableau haut, montré vingt lignes à la fois.
 *
 * La hauteur n'est pas devinée en rem : les lignes du carnet tiennent sur une
 * ou deux lignes de texte selon ce que porte la ligne, et une estimation
 * couperait au milieu d'une rangée. On mesure donc la vingt-et-unième et on
 * arrête la boîte juste avant : le lecteur voit vingt rangées entières, et la
 * vingt-et-unième dépasse à peine, ce qui est la seule façon honnête de lui
 * dire qu'il en reste.
 *
 * « Tout afficher » rend au tableau sa hauteur entière : la page défile alors
 * pour lui, ce qui est ce qu'on veut quand on relit le carnet en entier.
 * L'en-tête reste collé dans les deux cas.
 */
export function TallTable({ cap = 20, total, children }: { cap?: number; total: number; children: ReactNode }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState<number>();
  const [all, setAll] = useState(false);
  const over = total > cap;

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const head = el.querySelector("thead");
    const rows = el.querySelectorAll("tbody tr");
    if (rows.length <= cap) return setMax(undefined);
    const top = el.getBoundingClientRect().top + el.scrollTop;
    const cut = rows[cap].getBoundingClientRect().top + el.scrollTop;
    // Une lichette de la rangée suivante : elle dit qu'il y en a d'autres.
    setMax(Math.round(cut - top + (head ? 0 : 0) + 18));
  }, [cap]);

  useEffect(() => {
    measure();
    // On observe le tableau, pas la boîte : sa hauteur à lui ne bouge pas
    // quand la boîte se plafonne, donc pas de boucle.
    const tbl = box.current?.querySelector("table");
    if (!tbl || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(tbl);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <>
      <div ref={box} className={styles.box} style={all || max == null ? undefined : { maxHeight: `${max}px` }}>
        {children}
      </div>
      {over && (
        <button type="button" className={styles.more} onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? t("N'en montrer que {n}", { n: cap }) : t("Tout afficher : {n} lignes", { n: total })}
        </button>
      )}
    </>
  );
}
