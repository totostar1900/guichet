import styles from "./MiniCourbe.module.css";

/**
 * LE PETIT GRAPHE D'UNE LIGNE (3 novembre 2026) : la forme d'un cours sur la fenêtre, sans axe ni
 * légende — « un petit graphe de performance dans la ligne ». Il tient dans une rangée de 64 px, et la
 * rangée garde son nom, son cours et sa variation écrits : le dessin montre la forme, jamais le chiffre.
 *
 * LA TEINTE SUIT LE SIGNE SUR LA FENÊTRE (vert, rouge, ou gris pour un cours inchangé), et le pointillé est
 * le cours de DÉPART : on voit d'un coup d'œil de quel côté de lui la ligne a fini. La teinte ne porte rien
 * seule : la variation voisine écrit son signe.
 */
export function MiniCourbe({ serie, largeur = 96, hauteur = 34 }: { serie: number[]; largeur?: number; hauteur?: number }) {
  if (serie.length < 2) return null;
  const pad = 3;
  const lo = Math.min(...serie);
  const hi = Math.max(...serie);
  const x = (i: number) => pad + (i / (serie.length - 1)) * (largeur - 2 * pad);
  const y = (v: number) => (hi === lo ? hauteur / 2 : pad + (1 - (v - lo) / (hi - lo)) * (hauteur - 2 * pad));
  const fin = serie[serie.length - 1];
  const ton = fin > serie[0] ? styles.hausse : fin < serie[0] ? styles.baisse : styles.stable;
  return (
    <svg className={`${styles.courbe} ${ton}`} viewBox={`0 0 ${largeur} ${hauteur}`} width={largeur} height={hauteur} aria-hidden="true">
      <line className={styles.depart} x1={pad} x2={largeur - pad} y1={y(serie[0])} y2={y(serie[0])} />
      <polyline className={styles.trait} points={serie.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
      <circle className={styles.fin} cx={x(serie.length - 1)} cy={y(fin)} r={2.6} />
    </svg>
  );
}
