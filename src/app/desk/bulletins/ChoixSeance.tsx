"use client";

import { useRouter } from "next/navigation";
import styles from "./comparateur.module.css";

/**
 * Le choix d'une séance parmi les huit cents.
 *
 * UNE LISTE NATIVE, et non un champ de recherche : les séances sont des dates,
 * elles se parcourent mieux qu'elles ne se tapent, et le navigateur du
 * téléphone ouvre sa propre roulette. Les flèches à côté font le pas de un,
 * qui est le geste le plus fréquent : comparer une séance à sa voisine.
 *
 * L'ADRESSE RESTE LA SEULE MÉMOIRE. Le gabarit porte un trou que la date
 * vient remplir, pour que la construction du lien vive au même endroit que
 * celle des filtres au lieu d'être réécrite ici.
 */
export function ChoixSeance({ valeur, seances, gabarit, etiquette }: { valeur: string; seances: string[]; gabarit: string; etiquette: string }) {
  const router = useRouter();
  return (
    <select
      aria-label={etiquette}
      className={styles.choix}
      value={valeur}
      onChange={(e) => router.push(gabarit.replace("__D__", e.target.value))}
    >
      {seances.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
