"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./ClavierCode.module.css";

/**
 * QUATRE RONDS ET UN CLAVIER À CHIFFRES : le code de l'appareil se tape au pouce, sans champ à viser ni clavier du téléphone qui s'ouvre (19 novembre 2026).
 * Partagé par la création du compte (fixer le code) et par le déverrouillage (le saisir) : un seul geste, un seul composant. `cle` change à chaque pas pour qu'un même code saisi deux fois de suite soit rendu deux fois.
 */
export function ClavierCode({ onFini, occupe, cle, erreur }: { onFini: (code: string) => void; occupe: boolean; cle: string; erreur?: React.ReactNode }) {
  const t = useT();
  const [saisi, setSaisi] = useState("");
  const dernier = useRef("");
  /* LA FONCTION CHANGE À CHAQUE RENDU DU PARENT : l'attendre dans les dépendances annulait la minuterie quand une erreur ou un état s'affichait entre-temps, et le code complet n'était jamais rendu. */
  const rendre = useRef(onFini);
  useEffect(() => {
    rendre.current = onFini;
  }, [onFini]);
  const ajouter = useCallback((c: string) => setSaisi((s) => (s.length >= 4 ? s : s + c)), []);
  /* Le code est complet : on le rend une fois, puis le clavier se vide pour le pas suivant (ou pour un nouvel essai). */
  useEffect(() => {
    if (saisi.length === 4 && dernier.current !== `${cle}${saisi}`) {
      dernier.current = `${cle}${saisi}`;
      const c = saisi;
      const id = setTimeout(() => {
        setSaisi("");
        dernier.current = "";
        rendre.current(c);
      }, 160);
      return () => clearTimeout(id);
    }
  }, [saisi, cle]);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) ajouter(e.key);
      else if (e.key === "Backspace") setSaisi((s) => s.slice(0, -1));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ajouter]);
  return (
    <>
      <div className={styles.ronds} aria-label={t("{n} chiffres saisis sur 4", { n: saisi.length })}>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} data-plein={i < saisi.length ? "1" : "0"} />
        ))}
      </div>
      {erreur}
      <div className={styles.clavier}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((c) => (
          <button key={c} type="button" disabled={occupe} onClick={() => ajouter(c)}>
            {c}
          </button>
        ))}
        <span />
        <button type="button" disabled={occupe} onClick={() => ajouter("0")}>
          0
        </button>
        <button type="button" aria-label={t("Effacer")} onClick={() => setSaisi((s) => s.slice(0, -1))}>
          ⌫
        </button>
      </div>
    </>
  );
}
