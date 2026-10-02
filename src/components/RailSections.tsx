"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./RailSections.module.css";

/**
 * Le rail d'une page à sections : la carte d'une page qu'on ne parcourt plus à
 * l'aveugle.
 *
 * IL A QUITTÉ « components/desk » le 2 octobre 2026, parce qu'il sert aussi la
 * page Analyse du client. Un cliquet interdit au Guichet de citer un composant
 * du desk, et il a raison : ce qui est réservé au desk ne doit pas se retrouver
 * sous les yeux d'un client par la porte d'un import. Ce rail-ci ne porte aucun
 * savoir du desk, seulement une liste de sections, donc il déménage plutôt que
 * d'être recopié.
 *
 * La courbe et les analyses étaient deux écrans, et personne ne lisait le
 * premier sans le second : un rendement congolais à seize pour cent ne se
 * comprend qu'à côté d'une couverture tombée sous cent, et le chemin entre les
 * deux pages était exactement l'endroit où l'on renonçait à vérifier. Réunies,
 * elles font douze sections, ce qui est bien au-delà de ce qu'un lecteur
 * parcourt de haut en bas.
 *
 * D'où ce rail. Il groupe les sections par ce qu'elles répondent, le prix, les
 * volumes, le secondaire, puis ce qu'il faut vérifier avant de publier, et il
 * porte le compte de ce qui reste ouvert : on voit du haut de la page qu'il y a
 * deux contradictions à regarder, sans avoir descendu sept mille pixels.
 *
 * Le suivi de lecture se fait par observation d'intersection plutôt qu'au
 * défilement : le navigateur sait le faire sans réveiller la page à chaque
 * pixel, et une page longue n'a pas besoin d'un gestionnaire qui s'exécute
 * soixante fois par seconde.
 */
export interface SectionRail {
  id: string;
  titre: string;
  groupe: string;
  /** Ce qui reste ouvert dans cette section, et se compte. */
  alerte?: number;
}

export function RailSections({ sections }: { sections: SectionRail[] }) {
  const t = useT();
  const [courante, setCourante] = useState(sections[0]?.id);

  useEffect(() => {
    /**
     * La marge haute écarte l'en-tête, la marge basse empêche qu'une section
     * traversée en diagonale prenne la main : ce qui compte est celle qui
     * occupe le haut de l'écran, pas celle qui l'effleure.
     */
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) if (e.isIntersecting) setCourante(e.target.id);
      },
      { rootMargin: "-10% 0px -75% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [sections]);

  // Le groupe se décide avant le rendu : muter une variable pendant qu'on rend
  // marche une fois et se détraque à la deuxième passe, et React le dit.
  const ouvreGroupe = sections.map((s, i) => s.groupe !== sections[i - 1]?.groupe);

  return (
    <nav className={styles.rail} aria-label={t("Sections de la page")}>
      <p className={styles.titre}>{t("Analyse")}</p>
      {sections.map((s, i) => {
        return (
          <div key={s.id}>
            {ouvreGroupe[i] && <p className={styles.groupe}>{t(s.groupe)}</p>}
            <a href={`#${s.id}`} aria-current={courante === s.id} className={styles.lien}>
              <span className={styles.no}>{i + 1}</span>
              <span>{t(s.titre)}</span>
              {s.alerte ? <span className={styles.compte}>{s.alerte}</span> : null}
            </a>
          </div>
        );
      })}
    </nav>
  );
}
