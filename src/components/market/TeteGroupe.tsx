"use client";

import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { conduireVers } from "@/lib/ui/sommaire";
import { useFermeDehors } from "@/lib/ui/ferme-dehors";
import styles from "./TeteGroupe.module.css";

/** Un groupe tel que le sommaire le montre : sa clef d'ancre, son nom court, son nom entier, son compte. */
export type Groupe = { clef: string; nom: string; entier: string; n: number };

/**
 * LE TITRE D'UN GROUPE EST LE SOMMAIRE : il n'y a pas de bande au-dessus.
 *
 * LA BANDE ÉTAIT DIMENSIONNÉE POUR QUATRE, ON LUI EN AVAIT DONNÉ TREIZE.
 * Elle vient des titres, où elle porte cinq sections fixes et courtes.
 * Mesuré sur les fonds le 4 octobre 2026, écran de 412 px : par catégorie,
 * 4 pastilles et 412 px, elle tient tout juste ; par dépositaire, 1 806 px,
 * soit 4,4 écrans de glissement latéral ; par société de gestion, 2 718 px,
 * soit 6,6 écrans — et la plus large des pastilles, 351 px, prenait 85 % de
 * la largeur du téléphone à elle seule.
 *
 * Trois raisons de la retirer plutôt que de la rétrécir. Elle RÉPÈTE ce titre
 * figé, qui nomme déjà le groupe qu'on lit. Elle COÛTE 42 px sur chaque écran
 * d'une page qu'on parcourt. Et son geste — glisser de côté dans une rangée
 * de 28 px de haut — est le plus difficile du téléphone, là où une liste
 * verticale est le plus facile.
 *
 * Ce qu'elle offrait et qui se perd : le coup d'œil sur les groupes voisins
 * sans rien toucher. Il n'existait déjà pas à 6,6 écrans ; le treizième
 * groupe n'était pas visible, il était derrière un geste long.
 *
 * Le compte reste à côté du nom parce qu'il répond avant le saut :
 * « Harvest 10 » dit combien de lignes on s'apprête à traverser. « unite »
 * est le mot qui le suit, parce qu'on ne compte pas des fonds sur une page
 * d'adjudications.
 */
export function TeteGroupe({ id, nom, entier, n, groupes, unite = "lignes" }: { id: string; nom: string; entier: string; n: number; groupes: Groupe[]; unite?: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const tete = useRef<HTMLHeadingElement>(null);
  useFermeDehors(boite, ouvert, () => setOuvert(false));
  const seul = groupes.length < 2;
  return (
    <div className={styles.teteBoite} ref={boite}>
      <h2 id={id} className={styles.teteGroupe} ref={tete} title={entier !== nom ? entier : undefined}>
        <button type="button" className={styles.teteBouton} onClick={() => !seul && setOuvert(!ouvert)} aria-expanded={seul ? undefined : ouvert} disabled={seul} aria-label={`${entier} · ${n} ${t(unite)}${seul ? "" : ` · ${t("Aller à un groupe")}`}`}>
          <span>{nom}</span>
          {/* LA QUANTITÉ A QUITTÉ LE TITRE, pas l'étiquette parlée. Elle
              répétait ce que les rangées montrent, et sur une liste groupée
              par société de gestion elle mettait un nombre tous les deux
              centimètres. Le lecteur d'écran, lui, en a besoin : il ne voit
              pas les rangées, et l'« aria-label » la garde. */}
          {!seul && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d={ouvert ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
            </svg>
          )}
        </button>
      </h2>
      {ouvert && (
        <div className={styles.teteListe} role="group" aria-label={t("Aller à un groupe")}>
          {groupes.map((g) => (
            <button
              key={g.clef}
              type="button"
              className={g.clef === id.slice(4) ? styles.teteIci : undefined}
              title={g.entier !== g.nom ? g.entier : undefined}
              onClick={() => {
                setOuvert(false);
                /* LE SAUT SE MESURE DEPUIS CE TITRE-CI, qui est épinglé : le
                   bloc visé vient s'y poser, et comme il commence lui aussi
                   par son titre, c'est le titre d'arrivée qui prend la place
                   exacte du titre de départ. Aucune constante à tenir. */
                conduireVers(g.clef, tete.current?.getBoundingClientRect().top ?? 0);
              }}
            >
              <span>{g.nom}</span>
              <b>{g.n}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
