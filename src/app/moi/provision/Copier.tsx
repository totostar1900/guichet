"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/**
 * RECOPIER UN RIB À LA MAIN EST LA PREMIÈRE CAUSE DE VIREMENT PERDU.
 *
 * Le motif surtout : c'est lui qui rattache le virement au compte, et c'est
 * lui qu'on tape de mémoire dans une application bancaire, sur un téléphone,
 * en changeant d'écran. Une lettre de travers et l'argent arrive sans nom :
 * le desk le voit alors comme un virement à rattacher, et le client attend.
 *
 * Le bouton dit qu'il a copié, et redevient lui-même : sans cette réponse, on
 * appuie deux fois, puis on recopie quand même à la main.
 */
export function Copier({ valeur, quoi }: { valeur: string; quoi: string }) {
  const t = useT();
  const [copie, setCopie] = useState(false);
  return (
    <button
      type="button"
      className={styles.copier}
      aria-label={t("Copier {quoi}", { quoi })}
      onClick={() => {
        navigator.clipboard?.writeText(valeur).then(
          () => {
            setCopie(true);
            setTimeout(() => setCopie(false), 2000);
          },
          /* Un presse-papiers refusé (contexte non sécurisé, permission) ne
             doit pas laisser croire que c'est copié : le texte reste à côté,
             il se sélectionne à la main. */
          () => setCopie(false),
        );
      }}
    >
      {copie ? t("copié") : t("copier")}
    </button>
  );
}
