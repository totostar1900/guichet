"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { useVerrouDeDefilement } from "@/components/mobile/verrou-defilement";
import styles from "./tiroir.module.css";

/**
 * LE TIROIR DU RAPPORT.
 *
 * Il glisse par-dessus la liste sans la quitter : les filtres, la vue et le
 * défilement restent derrière lui, et c'est tout l'intérêt quand on ouvre
 * trois rapports à la suite depuis la même sélection.
 *
 * L'ADRESSE CHANGE QUAND MÊME, parce que la route est interceptée et non
 * remplacée. Le rapport garde donc son lien : collé dans un message ou
 * rechargé, il s'ouvre en page entière. On n'a pas eu à choisir entre « ça
 * glisse » et « ça s'envoie ».
 *
 * Fermer, c'est revenir en arrière : l'adresse reprend celle de la liste, et
 * le bouton « précédent » du navigateur fait la même chose que la croix, ce
 * qui est la seule façon qu'un tiroir d'adresse ne surprenne personne.
 */
export function Tiroir({ titre, children }: { titre: string; children: React.ReactNode }) {
  const router = useRouter();
  const t = useT();
  const boite = useRef<HTMLDivElement>(null);

  const fermer = () => router.back();

  /* LE VERROU DE LA MAISON, ET NON LE MIEN. J'avais écrit
     « body.style.overflow = hidden », ce que quatre composants faisaient avant
     d'apprendre que cela n'arrête pas iOS Safari : il faut sortir le corps du
     flux. Le helper le fait, compte les feuilles imbriquées, et empêche le
     tiré-pour-rafraîchir de fermer le tiroir en perdant ce qu'il montrait. */
  useVerrouDeDefilement(true);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", auClavier);
    /* Le focus entre dans le tiroir, sinon la tabulation continue de parcourir
       la liste cachée derrière. */
    boite.current?.focus();
    return () => document.removeEventListener("keydown", auClavier);
  }, [router]);

  return (
    <>
      <div className={styles.voile} onClick={fermer} aria-hidden="true" />
      <aside ref={boite} className={styles.tiroir} role="dialog" aria-modal="true" aria-label={titre} tabIndex={-1}>
        <div className={styles.tete}>
          <b>{titre}</b>
          <button type="button" className={styles.fermer} onClick={fermer} aria-label={t("Fermer")}>
            ×
          </button>
        </div>
        <div className={styles.corps}>{children}</div>
      </aside>
    </>
  );
}
