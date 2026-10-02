"use client";

import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/**
 * LES ÉTAPES D'UN SERVICE, DÉPLIABLES SUR TÉLÉPHONE.
 *
 * Elles disent ce qu'il va falloir faire, dans l'ordre, et c'est la seule
 * liste numérotée de la maison parce que c'est la seule vraie séquence. Sur
 * grand écran elles tiennent à côté de la phrase et se lisent d'un coup d'œil.
 *
 * Sur téléphone elles empilaient quatre lignes sous chacun des neuf services :
 * la page devenait un mur, et ce qu'on cherchait, le geste, se retrouvait à
 * trois écrans du titre. Elles passent donc derrière un bouton, et la liste
 * reste la même.
 *
 * Le pli est tenu en React et non par un `details` : la balise native masque
 * ses enfants par son propre mécanisme, qu'une feuille de style ne peut pas
 * annuler proprement pour les rouvrir sur grand écran. Ici la règle est dans
 * la feuille de style, et l'attribut ne sert qu'au téléphone.
 */
export function Etapes({ items }: { items: string[] }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return (
    <div className={styles.pas} data-ouvert={ouvert ? "1" : "0"}>
      <button type="button" className={styles.pasBtn} aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert((v) => !v)}>
        {t(ouvert ? "Masquer les étapes" : "Les étapes")}
      </button>
      <ol className={styles.etapes} id={id}>
        {items.map((e) => (
          <li key={e}>{t(e)}</li>
        ))}
      </ol>
    </div>
  );
}
