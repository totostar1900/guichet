"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFermeDehors } from "@/lib/ui/ferme-dehors";
import styles from "./comparateur.module.css";

/**
 * Le choix d'une séance parmi les huit cents.
 *
 * LA LISTE NATIVE EST PARTIE, ET POUR UNE RAISON MESURÉE À L'ŒIL : un
 * « select » décide seul de son sens d'ouverture, et le comparateur vit au bas
 * d'une page longue de huit cents lignes. Il s'ouvrait donc VERS LE HAUT, par
 * dessus le tableau, ce qui renverse la règle de la maison — une feuille tombe
 * du bord de son déclencheur, jamais ailleurs. Rien en CSS ne commande ce sens
 * sur une liste native : il fallait notre propre panneau.
 *
 * IL EST BORNÉ ET IL DÉFILE. C'est ce qui permet de l'accrocher vers le bas
 * sans risquer de sortir de l'écran, et c'est aussi pourquoi la liste
 * déroulante des filtres ne pouvait pas servir : elle n'a ni hauteur maximale
 * ni défilement, et passe chaque libellé par le traducteur. Huit cents dates
 * n'ont rien à traduire.
 *
 * L'ANNÉE EST UN REPÈRE COLLANT, pas un bouton : on cherche « mars 2024 » en
 * faisant défiler, et sans en-tête on ne sait plus où l'on est. À l'ouverture,
 * la date choisie est amenée sous les yeux — une liste qui s'ouvre sur 2026
 * quand on regarde 2023 oblige à tout refaire.
 *
 * L'ADRESSE RESTE LA SEULE MÉMOIRE. Le gabarit porte un trou que la date
 * vient remplir, pour que la construction du lien vive au même endroit que
 * celle des filtres au lieu d'être réécrite ici.
 */
/** Au-delà, la liste occuperait l'écran sans qu'on y voie plus de dates. */
const PLAFOND = 320;
/** En deçà, une liste ne se parcourt plus : mieux vaut déborder et défiler. */
const PLANCHER = 160;
const MARGE = 12;

export function ChoixSeance({ valeur, seances, gabarit, etiquette }: { valeur: string; seances: string[]; gabarit: string; etiquette: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [haut, setHaut] = useState(PLAFOND);
  const boite = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const choisi = useRef<HTMLButtonElement>(null);
  useFermeDehors(boite, ouvert, () => setOuvert(false));

  useEffect(() => {
    if (!ouvert) return;
    /* La place sous le bouton, mesurée à l'ouverture, là où elle est connue.
       Sans cela le panneau débordait de l'écran par le bas : mesuré à 96 px
       dans une fenêtre de 380. En dessous du plancher on laisse déborder
       plutôt que d'offrir une meurtrière de deux lignes, la page défilant. */
    const r = boite.current?.getBoundingClientRect();
    const place = r ? window.innerHeight - r.bottom - MARGE : PLAFOND;
    setHaut(Math.min(PLAFOND, Math.max(PLANCHER, place)));
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    /* ON NE FAIT DÉFILER QUE L'INTÉRIEUR DU PANNEAU, et c'est mesuré :
       « scrollIntoView » emporte aussi la page, qui emporte le panneau — il
       se retrouvait 655 px sous le bas de l'écran, après avoir été posé juste
       sous son bouton. Un déplacement vertical direct ne touche à rien
       d'autre. Deux effets et non un : la hauteur doit être posée avant que
       la position du choix ne se calcule dessus. */
    const m = menu.current;
    const c = choisi.current;
    if (m && c) m.scrollTop = c.offsetTop - m.clientHeight / 2 + c.offsetHeight / 2;
  }, [ouvert, haut]);

  return (
    <div className={styles.choixBoite} ref={boite}>
      <button type="button" className={styles.choix} aria-expanded={ouvert} aria-label={etiquette} onClick={() => setOuvert(!ouvert)}>
        <span className="mono">{valeur}</span>
        <span className={styles.choixChev} aria-hidden="true">
          ▾
        </span>
      </button>
      {ouvert && (
        <div className={styles.choixMenu} ref={menu} style={{ maxHeight: haut }} role="listbox" aria-label={etiquette}>
          {seances.map((d, i) => (
            <div key={d}>
              {d.slice(0, 4) !== seances[i - 1]?.slice(0, 4) ? <div className={styles.choixAn}>{d.slice(0, 4)}</div> : null}
              <button
                type="button"
                ref={d === valeur ? choisi : undefined}
                role="option"
                aria-selected={d === valeur}
                className={`${styles.choixJour} ${d === valeur ? styles.choixJourOn : ""}`}
                onClick={() => {
                  setOuvert(false);
                  router.push(gabarit.replace("__D__", d));
                }}
              >
                {d}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
