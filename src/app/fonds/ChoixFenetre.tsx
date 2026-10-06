"use client";

import { useT } from "@/i18n/client";
import { FENETRES, type FenetreId } from "@/lib/domain/fund-perf";
import { useNomFenetre } from "./fenetre";
import styles from "./bande.module.css";

/**
 * LA FENÊTRE D'OBSERVATION : QUATRE BOUTONS NOMMÉS, PAS UN CURSEUR.
 *
 * Cinq ans figure, éteint, et c'est le cœur de l'affaire. La plus ancienne VL
 * du dépôt est du 5 janvier 2023 : aucun fonds ne peut porter cinq ans avant
 * janvier 2028. Un curseur aurait offert cette position comme les autres,
 * rendu un tableau vide, et n'aurait rien eu pour dire pourquoi. Un bouton
 * porte sa couverture — « 1 an · 38 fonds » — et celui qui ne couvre personne
 * le dit sans se laisser toucher.
 *
 * LE COMPTE EST CELUI DES FONDS MESURABLES, pas celui des fonds. Un fonds né
 * il y a huit mois n'a pas de douze mois : le tiret dit qu'il n'y a rien à
 * mesurer, jamais que la performance est nulle.
 */
export function ChoixFenetre({ fenetre, comptes, surChoix }: { fenetre: FenetreId; comptes: Record<FenetreId, number>; surChoix: (f: FenetreId) => void }) {
  const t = useT();
  const noms = useNomFenetre();
  return (
    <div className={styles.fenetres} role="group" aria-label={t("Fenêtre d'observation")}>
      <span className={styles.fenEtiq}>{t("Mesurer sur")}</span>
      {FENETRES.map((f) => (
        <button
          key={f.id}
          type="button"
          className={styles.fen}
          aria-pressed={f.id === fenetre}
          onClick={() => surChoix(f.id)}
          disabled={comptes[f.id] === 0}
        >
          <b>{noms[f.id]}</b>
          <small>{t("{n} fonds", { n: comptes[f.id] })}</small>
        </button>
      ))}
      {/* Cinq ans n'est pas un oubli : il est là, éteint, et il dit pourquoi. */}
      <span className={styles.fenVide} title={t("La plus ancienne valeur liquidative que nous ayons lue est du 5 janvier 2023 : cinq ans ne sera mesurable qu'en janvier 2028.")}>
        <b>{t("5 ans")}</b>
        <small>{t("pas avant 2028")}</small>
      </span>
    </div>
  );
}
