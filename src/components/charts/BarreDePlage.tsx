"use client";

import { useT } from "@/i18n/client";
import { indexDeLaDate, poserFenetre } from "@/lib/domain/indice-fenetre";
import styles from "./BarreDePlage.module.css";

/**
 * LA BARRE DE PLAGE, UNE SEULE FORME POUR TOUTE LA PLATEFORME.
 *
 * Deux bornes qui se lisent ET se saisissent, et deux poignées qui règlent les
 * mêmes. Elle est née sur l'indice, où il y en avait deux qui ne commandaient
 * pas la même chose : des poignées sur la fenêtre, et deux champs de dates qui
 * posaient des épingles. Choisir une date ne changeait alors rien à ce qu'on
 * voyait. Le panneau du négoce de la page Analyse en demandait une à son tour,
 * d'où ce composant plutôt qu'une seconde copie : deux copies d'une commande
 * qu'on vient de réparer, c'est la réparation qu'on perd.
 *
 * Elle vit en mémoire et non dans l'adresse : ces pages sont rendues sur le
 * serveur, et une poignée qui écrirait l'adresse à chaque pas traînerait d'un
 * aller-retour par pixel.
 */
export function BarreDePlage({
  dates,
  fenetre,
  surFenetre,
  surTout,
  motTout,
}: {
  /** Toutes les dates de la série, en ordre chronologique. */
  dates: string[];
  fenetre: [number, number];
  surFenetre: (f: [number, number]) => void;
  /** Rendre la plage entière ; le bouton ne paraît que si on a resserré. */
  surTout?: () => void;
  /** « revenir à la période » là où des périodes existent, « tout afficher » sinon. */
  motTout?: string;
}) {
  const t = useT();
  const n = dates.length;
  const dernier = Math.max(0, n - 1);
  const poser = (a: number, b: number) => surFenetre(poserFenetre(n, a, b));
  const resserre = fenetre[0] !== 0 || fenetre[1] !== dernier;

  return (
    <div className={styles.bloc}>
      <div className={styles.lu}>
        <label>
          {t("Du")}
          <input
            type="date"
            value={dates[fenetre[0]] ?? ""}
            min={dates[0] ?? ""}
            max={dates[dernier] ?? ""}
            onChange={(e) => e.target.value && poser(indexDeLaDate(dates, e.target.value), fenetre[1])}
          />
        </label>
        <label>
          {t("Au")}
          <input
            type="date"
            value={dates[fenetre[1]] ?? ""}
            min={dates[0] ?? ""}
            max={dates[dernier] ?? ""}
            onChange={(e) => e.target.value && poser(fenetre[0], indexDeLaDate(dates, e.target.value))}
          />
        </label>
        <span>{t("{n} séances sur {m}", { n: String(fenetre[1] - fenetre[0] + 1), m: String(n) })}</span>
        {resserre && surTout && (
          <button type="button" className={styles.tout} onClick={surTout}>
            {motTout ?? t("tout afficher")}
          </button>
        )}
      </div>
      <div className={styles.barre}>
        <span className={styles.piste} aria-hidden="true" />
        <span
          className={styles.pisteOn}
          style={{ left: `${(fenetre[0] / Math.max(dernier, 1)) * 100}%`, right: `${100 - (fenetre[1] / Math.max(dernier, 1)) * 100}%` }}
          aria-hidden="true"
        />
        <input type="range" min={0} max={dernier} step={1} value={fenetre[0]} aria-label={t("Première séance affichée")} onChange={(e) => poser(Number(e.target.value), fenetre[1])} />
        <input type="range" min={0} max={dernier} step={1} value={fenetre[1]} aria-label={t("Dernière séance affichée")} onChange={(e) => poser(fenetre[0], Number(e.target.value))} />
      </div>
    </div>
  );
}
