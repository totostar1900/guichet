"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useTransition } from "react";
import { texteDuSuivi, useBulle } from "@/components/mobile/Bulle";
import { useSuivi } from "@/lib/ui/suivi";
import { toggleWatch } from "@/app/offres/[id]/actions";
import styles from "./WatchButton.module.css";

/**
 * « Suivre » : une étoile, pleine quand la ligne l'est.
 *
 * C'était un bouton de texte, quatrième d'une rangée qui en portait quatre,
 * dans un en-tête qui porte déjà deux pastilles. Un suivi est un interrupteur,
 * pas une phrase : l'étoile le dit dans la place d'un pouce, et le mot reste
 * dans l'infobulle et pour les lecteurs d'écran.
 */
export function WatchButton({ offerId, initial, signedIn, cadence }: { offerId: string; initial: boolean; signedIn: boolean; cadence?: "evenement" | "quotidien" }) {
  /* LE MÊME ÉTAT DE SUIVI QUE LE MENU, LE GLISSEMENT ET LA CLOCHE (7 novembre 2026), et la même bulle : l'étoile de la fiche ne parlait pas et pouvait diverger. */
  const [on, setOn] = useSuivi(offerId, initial);
  const { dire } = useBulle();
  const [pending, start] = useTransition();
  const t = useT();
  const star = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.6l-5.5 2.9 1-6.2L3 9.9l6.2-.9z" />
    </svg>
  );
  if (!signedIn) {
    return (
      <Link className={styles.star} href={`/connexion?next=${encodeURIComponent(`/offres/${offerId}`)}`} title={t("Connectez-vous pour suivre cette ligne")} aria-label={t("Suivre")}>
        {star}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={`${styles.star} ${on ? styles.on : ""}`}
      disabled={pending}
      aria-pressed={on}
      aria-label={t(on ? "Suivie" : "Suivre")}
      title={t(on ? "Vous êtes prévenu à chaque changement de cours, de prix ou de statut" : "Recevoir un message à chaque changement de cours, de prix ou de statut")}
      onClick={() => {
        /* LE GESTE SE VOIT TOUT DE SUITE (10 novembre 2026) : l'étoile bascule au toucher, avant la réponse du serveur ; sans cela il fallait toucher plusieurs fois pour comprendre qu'un seul suffisait. Si le serveur refuse, elle revient. */
        const avant = on;
        setOn(!avant);
        start(async () => {
          const res = await toggleWatch(offerId, !avant, cadence);
          if (res.ok) {
            setOn(res.watching);
            dire(texteDuSuivi(res.watching, cadence, t));
          } else {
            setOn(avant);
            dire(t("Le suivi n'a pas pu être modifié. Réessayez."));
          }
        });
      }}
    >
      {star}
    </button>
  );
}
