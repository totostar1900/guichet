"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { CHIFFRES_DU_CODE } from "@/lib/verrou";
import styles from "./ClavierCode.module.css";

/**
 * SIX RONDS ET UN CLAVIER À CHIFFRES : le code de l'appareil se tape au pouce, sans champ à viser ni clavier du téléphone qui s'ouvre (19 novembre 2026).
 * Partagé par la création du compte (fixer le code) et par le déverrouillage (le saisir) : un seul geste, un seul composant. `cle` change à chaque pas pour qu'un même code saisi deux fois de suite soit rendu deux fois.
 */
export function ClavierCode({ onFini, occupe, cle, erreur, empreinte }: { onFini: (code: string) => void; occupe: boolean; cle: string; erreur?: React.ReactNode; /** la touche en bas à gauche : Face ID ou l'empreinte, comme sur Revolut */ empreinte?: { onClick: () => void; label: string } }) {
  const t = useT();
  const [saisi, setSaisi] = useState("");
  const dernier = useRef("");
  /* LA FONCTION CHANGE À CHAQUE RENDU DU PARENT : l'attendre dans les dépendances annulait la minuterie quand une erreur ou un état s'affichait entre-temps, et le code complet n'était jamais rendu. */
  const rendre = useRef(onFini);
  useEffect(() => {
    rendre.current = onFini;
  }, [onFini]);
  const ajouter = useCallback((c: string) => setSaisi((s) => (s.length >= CHIFFRES_DU_CODE ? s : s + c)), []);
  /* Le code est complet : on le rend une fois, puis le clavier se vide pour le pas suivant (ou pour un nouvel essai). */
  useEffect(() => {
    if (saisi.length === CHIFFRES_DU_CODE && dernier.current !== `${cle}${saisi}`) {
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
      <div className={styles.ronds} aria-label={t("{n} chiffres saisis sur {m}", { n: saisi.length, m: CHIFFRES_DU_CODE })}>
        {Array.from({ length: CHIFFRES_DU_CODE }, (_, i) => i).map((i) => (
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
        {empreinte ? (
          <button type="button" aria-label={empreinte.label} className={styles.empreinte} onClick={empreinte.onClick}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
              <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
              <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
              <path d="M2 12a10 10 0 0 1 18-6" />
              <path d="M21.8 16c.2-2 .131-5.354 0-6" />
              <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
              <path d="M8.65 22c.21-.66.45-1.32.57-2" />
              <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
            </svg>
          </button>
        ) : (
          <span />
        )}
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
