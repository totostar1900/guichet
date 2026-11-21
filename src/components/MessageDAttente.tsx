"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./MessageDAttente.module.css";

/**
 * CE QUE L'ÉCRAN DIT PENDANT QU'IL ATTEND (21 novembre 2026, planche « Attente après le code », 1A · 2A · 3A).
 *
 * Après le sixième chiffre, la page paraissait figée : les ronds se vidaient, les chiffres s'éteignaient, rien ne disait que ça travaillait. Trois paliers, comptés depuis l'instant où l'attente commence :
 *
 *   niveau 0, avant 0,15 s : rien (une réponse rapide ne clignote pas) ;
 *   niveau 1, jusqu'à 4 s  : « Vérification… » ;
 *   niveau 2, jusqu'à 15 s : « La connexion est lente, un instant… » ;
 *   niveau 3, au-delà      : « Ça prend plus de temps que prévu. », et une porte de sortie, « Réessayer » (recharge la page).
 *
 * Le composant n'existe QUE pendant l'attente : en le montant on lance la minuterie, en le démontant on la remet à zéro. Il remplace la ligne de message sous les ronds, qui existait déjà et que personne n'écrivait.
 */
export const SEUILS_D_ATTENTE = { affiche: 150, lent: 4_000, tropLong: 15_000 } as const;

/** Le palier d'une attente qui dure depuis « ms » millisecondes. Fonction pure : la minuterie en dépend, l'épreuve aussi. */
export function niveauDAttente(ms: number): 0 | 1 | 2 | 3 {
  if (ms >= SEUILS_D_ATTENTE.tropLong) return 3;
  if (ms >= SEUILS_D_ATTENTE.lent) return 2;
  if (ms >= SEUILS_D_ATTENTE.affiche) return 1;
  return 0;
}

export function MessageDAttente({ avecBouton = true, depuis = 1 }: { /** « Réessayer » recharge la page : utile sur un écran à clavier, inutile sous un formulaire qui garde son bouton. */ avecBouton?: boolean; /** le premier palier montré : 2 sous un bouton qui dit déjà « Vérification… ». */ depuis?: 1 | 2 }) {
  const t = useT();
  const [niveau, setNiveau] = useState<0 | 1 | 2 | 3>(0);
  useEffect(() => {
    const ids = [
      setTimeout(() => setNiveau(niveauDAttente(SEUILS_D_ATTENTE.affiche)), SEUILS_D_ATTENTE.affiche),
      setTimeout(() => setNiveau(niveauDAttente(SEUILS_D_ATTENTE.lent)), SEUILS_D_ATTENTE.lent),
      setTimeout(() => setNiveau(niveauDAttente(SEUILS_D_ATTENTE.tropLong)), SEUILS_D_ATTENTE.tropLong),
    ];
    return () => ids.forEach(clearTimeout);
  }, []);
  const visible = niveau >= depuis;
  return (
    <div className={styles.attente} role="status" aria-live="polite">
      {visible && niveau === 1 && t("Vérification…")}
      {visible && niveau === 2 && t("La connexion est lente, un instant…")}
      {visible && niveau === 3 && (
        <>
          {t("Ça prend plus de temps que prévu.")}
          {avecBouton && (
            <button type="button" className={styles.reessayer} onClick={() => window.location.reload()}>
              {t("Réessayer")}
            </button>
          )}
        </>
      )}
      {!visible && <>&nbsp;</>}
    </div>
  );
}

/** Trois points qui ondulent, devant le texte d'un bouton qui attend : la même vague que les ronds du code. */
export function Attend({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.attend}>
      <span className={styles.points} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {children}
    </span>
  );
}
