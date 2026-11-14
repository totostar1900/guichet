"use client";

import { useEffect, useState } from "react";
import styles from "./BandeauDAnnonce.module.css";

const cle = (id: string) => `guichet:annonce:${id}`;

/**
 * La phrase, et la croix qui la ferme pour CET appareil : la fermeture se garde sous la clé de l'annonce, donc une nouvelle annonce reparaît. Avant que l'appareil réponde,
 * la phrase est montrée : une annonce qui apparaîtrait après coup ferait sauter la page.
 */
export function BandeauFermable({ id, texte, etiquette, fermer }: { id: string; texte: string; etiquette: string; fermer: string }) {
  const [ferme, setFerme] = useState(false);
  useEffect(() => {
    const attente = setTimeout(() => {
      try {
        setFerme(localStorage.getItem(cle(id)) === "1");
      } catch {
        /* stockage indisponible : l'annonce reste affichée */
      }
    }, 0);
    return () => clearTimeout(attente);
  }, [id]);
  if (ferme) return null;
  return (
    <aside className={styles.bandeau} role="note" aria-label={etiquette}>
      <span className={styles.texte}>
        <b>{etiquette}</b> {texte}
      </span>
      <button
        type="button"
        className={styles.croix}
        aria-label={fermer}
        onClick={() => {
          try {
            localStorage.setItem(cle(id), "1");
          } catch {
            /* la fermeture ne se garde pas, elle vaut pour cette page */
          }
          setFerme(true);
        }}
      >
        ✕
      </button>
    </aside>
  );
}
