"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { CHIFFRES_DU_CODE } from "@/lib/verrou";
import styles from "./ClavierCode.module.css";

/**
 * SIX RONDS ET UN CLAVIER À CHIFFRES : le code de l'appareil se tape au pouce, sans champ à viser ni clavier du téléphone qui s'ouvre (19 novembre 2026).
 * Partagé par la création du compte (fixer le code) et par le déverrouillage (le saisir) : un seul geste, un seul composant. `cle` change à chaque pas pour qu'un même code saisi deux fois de suite soit rendu deux fois.
 */
export function ClavierCode({ onFini, occupe, cle, erreur, enErreur }: { onFini: (code: string) => void; occupe: boolean; cle: string; erreur?: React.ReactNode; /** Vrai quand une erreur vient d'être posée : les ronds tremblent. Par défaut, la présence d'un « erreur ». */ enErreur?: boolean }) {
  const t = useT();
  const [saisi, setSaisi] = useState("");
  const dernier = useRef("");
  /* LE CODE RESTE VISIBLE PENDANT L'ATTENTE (21 novembre 2026, planche « Attente après le code », 1A) : les ronds ne se vident plus quand le code part, mais quand la réponse revient (ou tout de suite pour un pas qui n'attend rien). « rendu » dit qu'un code est parti et que ses ronds attendent. */
  const [rendu, setRendu] = useState(false);
  const [secoue, setSecoue] = useState(false);
  const erreurPosee = enErreur ?? Boolean(erreur);
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
        rendre.current(c);
        setRendu(true);
      }, 160);
      return () => clearTimeout(id);
    }
  }, [saisi, cle]);
  /* Les ronds se vident dès que plus rien n'attend : un instant de grâce, que « occupe » vrai dans le même temps annule (une réponse en route garde le code à l'écran). */
  useEffect(() => {
    if (!rendu || occupe) return;
    const id = setTimeout(() => {
      setSaisi("");
      dernier.current = "";
      setRendu(false);
    }, 80);
    return () => clearTimeout(id);
  }, [rendu, occupe]);
  /* Une erreur fait trembler les ronds une fois. */
  useEffect(() => {
    if (!erreurPosee) return;
    const debut = setTimeout(() => setSecoue(true), 0);
    const fin = setTimeout(() => setSecoue(false), 460);
    return () => {
      clearTimeout(debut);
      clearTimeout(fin);
    };
  }, [erreurPosee]);
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
      <div className={styles.ronds} data-attente={occupe && saisi.length === CHIFFRES_DU_CODE ? "1" : undefined} data-secoue={secoue ? "1" : undefined} aria-label={t("{n} chiffres saisis sur {m}", { n: saisi.length, m: CHIFFRES_DU_CODE })}>
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
