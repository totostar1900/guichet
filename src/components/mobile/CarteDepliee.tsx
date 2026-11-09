"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toggleWatch } from "@/app/offres/[id]/actions";
import { useT } from "@/i18n/client";
import { useSuivi } from "@/lib/ui/suivi";
import { texteDuSuivi, useBulle } from "./Bulle";
import styles from "./CarteDepliee.module.css";

/**
 * LE DOS D'UNE CARTE EST UNE EXTENSION VERS LE BAS (9 novembre 2026, planche « Gestes et feuilles », 4A).
 *
 * Titres, Fonds et Adjudications retournaient leur carte (un dos en 3D) en vue compacte. Elles la déplient maintenant : un chevron sous les « ··· », la même place sur les trois pages ; la carte
 * s'étend vers le bas, ce que disait le dos est dessous, puis une rangée de trois boutons alignés (l'action de la ligne, favori, la fiche).
 *
 * LE MOUVEMENT EST SEUL : la hauteur glisse (`grid-template-rows`, 0fr → 1fr), sans fondu, sans voile, sans dépassement de courbe. Un clic sur la carte mène toujours à la fiche : seul le chevron déplie.
 * La région fermée est `inert` : ni focus ni lecteur d'écran n'y entrent.
 */
export function useDepliee() {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return { ouvert, basculer: () => setOuvert((o) => !o), idRegion: `carte-${id.replace(/:/g, "")}` };
}

/** Le chevron, 34 px à anneau, sous les « ··· » : le même sur Titres, Fonds et Adjudications. */
export function ChevronDeplie({ ouvert, onClick, idRegion }: { ouvert: boolean; onClick: () => void; idRegion: string }) {
  const t = useT();
  return (
    <button type="button" data-coach="titres-deplier" className={styles.chevron} aria-expanded={ouvert} aria-controls={idRegion} onClick={onClick} aria-label={ouvert ? t("Replier la carte") : t("Déplier la carte")}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

/** La classe des « ··· » d'une carte : sans disque, la même sur toutes les pages. */
export const classePoints = styles.points;

/** La colonne des outils de la carte : « ··· » puis chevron, mêmes dimensions et même place partout. */
export function Outils({ children }: { children: React.ReactNode }) {
  return <span className={styles.outils}>{children}</span>;
}

/** La carte et son extension : l'extension s'ouvre sous la carte, collée à elle. */
export function Depliable({ ouvert, children }: { ouvert: boolean; children: React.ReactNode }) {
  return (
    <div className={styles.depliable} data-ouvert={ouvert}>
      {children}
    </div>
  );
}

export function Extension({ ouvert, idRegion, children }: { ouvert: boolean; idRegion: string; children: React.ReactNode }) {
  return (
    <div id={idRegion} className={styles.region} data-ouvert={ouvert} inert={!ouvert}>
      <div className={styles.interieur}>
        <div className={styles.contenu}>{children}</div>
      </div>
    </div>
  );
}

/**
 * LES TROIS BOUTONS, ALIGNÉS SOUS L'EXTENSION : l'action de la ligne (la même que celle du menu « ··· » et de la fiche), « Favori » (le suivi : un message à chaque mouvement de la cote, ou un
 * message par jour jusqu'à la clôture d'une adjudication), « Voir la fiche ».
 */
export function BoutonsDeLaCarte({ id, href, kind, past, cadence, suivi, agir = true }: { id: string; href: string; kind?: string; past?: boolean; cadence: "evenement" | "quotidien"; suivi?: boolean; /** Faux au desk : la ligne y a ses propres gestes. */ agir?: boolean }) {
  const t = useT();
  const router = useRouter();
  const { dire } = useBulle();
  const [on, setOn] = useSuivi(id, suivi);
  const [attente, demarrer] = useTransition();
  const action = agir && !past ? (kind === "FONDS" ? "Souscrire" : kind === "MARCHE" ? "Passer un ordre" : "Déclarer une intention") : null;
  const basculerFavori = () =>
    demarrer(async () => {
      const res = await toggleWatch(id, !on, cadence);
      if (res.ok) {
        setOn(res.watching);
        router.refresh();
        dire(texteDuSuivi(res.watching, cadence, t));
      } else router.push(`/connexion?next=${encodeURIComponent(`/offres/${id}`)}`);
    });
  return (
    <div className={styles.boutons}>
      {action && (
        <Link className={`btn primary ${styles.bouton}`} href={`/offres/${id}/intention`}>
          {t(action)}
        </Link>
      )}
      {agir && (
        <button type="button" className={`btn ${styles.bouton} ${on ? styles.favori : ""}`} aria-pressed={on} disabled={attente} onClick={basculerFavori}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
          </svg>
          {t("Favori")}
        </button>
      )}
      <Link className={`btn ${styles.bouton}`} href={href}>
        {t("Voir la fiche")}
      </Link>
    </div>
  );
}
