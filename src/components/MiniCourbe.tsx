"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "./MiniCourbe.module.css";

/**
 * LE PETIT GRAPHE D'UNE LIGNE (3 novembre 2026) : la forme d'un cours sur la fenêtre, sans axe ni
 * légende — « un petit graphe de performance dans la ligne ». Il tient dans une rangée de 64 px, et la
 * rangée garde son nom, son cours et sa variation écrits : le dessin montre la forme, jamais le chiffre.
 *
 * LA TEINTE SUIT LE SIGNE SUR LA FENÊTRE (vert, rouge, ou gris pour un cours inchangé), et le pointillé est
 * le cours de DÉPART : on voit d'un coup d'œil de quel côté de lui la ligne a fini. La teinte ne porte rien
 * seule : la variation voisine écrit son signe.
 *
 * ELLE SE TRACE QUAND ON LA VOIT (21 novembre 2026, le client : « animer les courbes à l'affichage de la feuille, ainsi qu'avec la section Ce qui performe »). Rendue ENTIÈRE par le serveur, elle est mise en attente avant la première image (`data-pret`), puis son trait se dessine de gauche à droite la première fois qu'elle est à moitié dans l'écran (`data-vu`) : celles qui sont déjà à l'écran à l'ouverture se tracent tout de suite, celles d'une section plus bas se tracent quand on y arrive. Une seule fois ; sans script ou avec « moins de mouvement », le dessin reste entier.
 */
export function MiniCourbe({ serie, largeur = 96, hauteur = 34 }: { serie: number[]; largeur?: number; hauteur?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    el.dataset.pret = "oui";
    const io = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          el.dataset.vu = "oui";
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (serie.length < 2) return null;
  const pad = 3;
  const lo = Math.min(...serie);
  const hi = Math.max(...serie);
  const x = (i: number) => pad + (i / (serie.length - 1)) * (largeur - 2 * pad);
  const y = (v: number) => (hi === lo ? hauteur / 2 : pad + (1 - (v - lo) / (hi - lo)) * (hauteur - 2 * pad));
  const fin = serie[serie.length - 1];
  const ton = fin > serie[0] ? styles.hausse : fin < serie[0] ? styles.baisse : styles.stable;
  return (
    <svg ref={ref} className={`${styles.courbe} ${ton}`} viewBox={`0 0 ${largeur} ${hauteur}`} width={largeur} height={hauteur} aria-hidden="true">
      <line className={styles.depart} x1={pad} x2={largeur - pad} y1={y(serie[0])} y2={y(serie[0])} />
      <polyline className={styles.trait} pathLength={1} points={serie.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
      <circle className={styles.fin} cx={x(serie.length - 1)} cy={y(fin)} r={2.6} />
    </svg>
  );
}
