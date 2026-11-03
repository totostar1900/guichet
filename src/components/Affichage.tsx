"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "./mobile/Sheet";
import { CardDisplaySheet, DensiteChoix } from "./Density";
import styles from "./Affichage.module.css";

export interface ChoixAffichage {
  /** Le titre du groupe de choix, déjà traduit. */
  quoi: string;
  valeur: string;
  options: [string, string][];
  onChange: (v: string) => void;
}

/**
 * « AFFICHAGE » : TRIER, GROUPER, CHOISIR LA VUE, DANS UNE FENÊTRE AU MILIEU DE L'ÉCRAN (4 novembre 2026).
 *
 * Sur Titres, Fonds et Adjudications, les commandes qui se règlent UNE FOIS (le tri, le regroupement, la vue, la
 * densité) tenaient autant de place que celles qu'on touche à chaque visite (la recherche, les filtres) : trois
 * rangées, quatre sur Titres. Elles sont ici, derrière un seul bouton, et la barre ne garde que « Rechercher »,
 * « Filtrer » et « Affichage » — la même sur les trois pages, qui ne montrent que ce qui s'y applique (les adjudications
 * n'ont ni tri ni recherche).
 *
 * UNE FENÊTRE CENTRÉE, et non une feuille du bas : choisi sur la planche du 4 novembre (option C). Les choix s'appliquent
 * tout de suite — la liste derrière bouge sous les yeux — et « Fermer » termine. « Tout effacer », qui défait tout ce que
 * la page a posé, vit en pied de fenêtre : éteint quand il n'y a rien à défaire, il ne s'apprend pas à chaud mais il est là.
 */
export function Affichage({ tri, groupe, vue, densite, onReset, aEffacer }: { tri?: ChoixAffichage & { sens?: "asc" | "desc"; onSens?: () => void }; groupe?: ChoixAffichage; vue?: ChoixAffichage; densite?: boolean; onReset: () => void; aEffacer: boolean }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [cartes, setCartes] = useState(false);

  const rangee = (c: ChoixAffichage) => (
    <div className={styles.groupe} role="group" aria-label={c.quoi} key={c.quoi}>
      <span className={styles.etiquette}>{c.quoi}</span>
      <div className={styles.options}>
        {c.options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={c.valeur === v} className={c.valeur === v ? styles.on : undefined} onClick={() => c.onChange(v)}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" className={styles.bouton} onClick={() => setOuvert(true)} aria-haspopup="dialog" aria-label={t("Affichage")} title={t("Affichage")} data-coach="titres-vues">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 4v16M8 20l-3-3M8 20l3-3M16 20V4M16 4l-3 3M16 4l3 3" />
        </svg>
        <span>{t("Affichage")}</span>
      </button>
      <Sheet
        open={ouvert}
        onClose={() => setOuvert(false)}
        title={t("Affichage")}
        centre
        foot={
          <div className={styles.pied}>
            <button type="button" className={styles.efface} onClick={onReset} disabled={!aEffacer} title={aEffacer ? undefined : t("Rien à effacer")}>
              {t("Tout effacer")}
            </button>
            <button type="button" className="btn primary" onClick={() => setOuvert(false)}>
              {t("Fermer")}
            </button>
          </div>
        }
      >
        <div className={styles.corps}>
          {tri && (
            <div className={styles.groupe}>
              {rangee(tri)}
              {tri.onSens && (
                <button type="button" className={styles.sens} onClick={tri.onSens} aria-label={t(tri.sens === "asc" ? "Ordre croissant" : "Ordre décroissant")}>
                  {tri.sens === "asc" ? "↑" : "↓"} {t(tri.sens === "asc" ? "Croissant" : "Décroissant")}
                </button>
              )}
            </div>
          )}
          {groupe && rangee(groupe)}
          {vue && rangee(vue)}
          {densite && (
            <div className={styles.groupe}>
              <span className={styles.etiquette}>{t("Densité des cartes")}</span>
              <DensiteChoix />
              <button type="button" className={styles.lien} onClick={() => setCartes(true)} aria-haspopup="dialog">
                {t("Choisir ce que montrent les cartes")}
              </button>
              <CardDisplaySheet open={cartes} onClose={() => setCartes(false)} />
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
