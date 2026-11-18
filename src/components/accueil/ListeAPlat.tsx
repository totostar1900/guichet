import type { ReactNode } from "react";
import { TraceSurVue } from "./TraceSurVue";
import styles from "./ListeAPlat.module.css";

/**
 * UNE LISTE À PLAT, DONT LES ICÔNES SE DESSINENT (18 novembre 2026, le client : « écrire à plat », « des icônes géométriques qui se dessinent graduellement dans la liste », « un jeu d'affichage ou une animation sur les icônes »).
 *
 * Pas de carte, pas de cadre, pas de numéro : une icône, un titre, une phrase, séparés par un filet. Les rangées arrivent l'une après l'autre (délai croissant) et chaque icône trace ses lignes juste après sa rangée. Le lancement est celui de « TraceSurVue » : à l'entrée dans l'écran, une fois.
 * Les icônes sont géométriques (carré, cercle, losange, triangle, courbe), au trait de 1,5 dans une grille de 24 : chaque trait porte « pathLength=1 » et « data-trait » pour que « stroke-dashoffset » le trace.
 */
export type Rangee = { clef: string; titre: string; dit: string; icone: ReactNode };

export function ListeAPlat({ rangees }: { rangees: Rangee[] }) {
  return (
    <TraceSurVue className={styles.trace}>
      <ul className={styles.liste}>
        {rangees.map((r, i) => (
          <li className={styles.ligne} key={r.clef} style={{ ["--rang" as string]: i }}>
            <svg className={styles.icone} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {r.icone}
            </svg>
            <div>
              <h3>{r.titre}</h3>
              <p>{r.dit}</p>
            </div>
          </li>
        ))}
      </ul>
    </TraceSurVue>
  );
}

/** Un trait de l'icône : « pathLength=1 » et « data-trait » pour que le tracé le lise. */
export const T = ({ d }: { d: string }) => <path d={d} pathLength={1} data-trait="" />;
/** Un cercle de l'icône, qui part du haut. */
export const C = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => <circle cx={cx} cy={cy} r={r} pathLength={1} transform={`rotate(-90 ${cx} ${cy})`} data-trait="" />;
