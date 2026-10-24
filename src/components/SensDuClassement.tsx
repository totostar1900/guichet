"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import type { Performance } from "@/lib/market/performe";
import styles from "./CeQuiPerforme.module.css";

/**
 * LE SENS DU CLASSEMENT : hausses ou baisses, sur la même fenêtre.
 *
 * Le seul état de la section, et il ne touche pas aux données : le classement
 * arrive calculé, trié, et cette pièce n'en montre qu'un bout. Rien à relire,
 * rien à recalculer — c'est pourquoi elle peut être un composant client sans
 * rien coûter.
 *
 * DEUX ONGLETS, ET L'ÉTAT NON CHOISI GARDE SON CONTOUR. Un segmenté qui ne se
 * distingue que par un remplissage disparaît pour qui ne voit pas la
 * différence de teinte ; « role=tab » et « aria-selected » le disent à qui
 * écoute la page, et la bordure le dit à qui la regarde.
 *
 * UN CÔTÉ VIDE SE NOMME. Sur cette place, il arrive qu'aucune ligne ne baisse
 * de tout un mois : un onglet qui s'ouvre sur rien se lit comme une panne,
 * alors qu'il dit quelque chose — que personne n'a reculé.
 */
export function SensDuClassement({ lignes, max = 3 }: { lignes: Performance[]; max?: number }) {
  const t = useT();
  const [baisse, setBaisse] = useState(false);

  /* Le classement arrive de la plus forte hausse à la plus forte baisse : les
     hausses sont donc la tête, et les baisses la queue, retournée pour que la
     plus forte vienne en premier dans les deux cas. */
  const hausses = lignes.filter((l) => l.variationPct > 0);
  const baisses = lignes.filter((l) => l.variationPct < 0).reverse();
  const vues = (baisse ? baisses : hausses).slice(0, max);

  return (
    <>
      <div className={styles.sens} role="tablist" aria-label={t("Sens du classement")}>
        <button type="button" role="tab" aria-selected={!baisse} className={`${styles.onglet} ${baisse ? "" : styles.actif}`} onClick={() => setBaisse(false)}>
          {t("Hausses")}
        </button>
        <button type="button" role="tab" aria-selected={baisse} className={`${styles.onglet} ${baisse ? styles.actif : ""}`} onClick={() => setBaisse(true)}>
          {t("Baisses")}
        </button>
      </div>

      {vues.length === 0 ? (
        <p className={styles.rien}>{baisse ? t("Aucune ligne n'a reculé sur la période.") : t("Aucune ligne n'a monté sur la période.")}</p>
      ) : (
        <ul className={styles.liste}>
          {vues.map((l) => (
            <li key={l.isin} className={styles.ligne}>
              <b className={styles.mnemo}>{l.mnemo}</b>
              <span className={styles.nom}>{l.nom}</span>
              <b className={styles.cours}>{fmt(Math.round(l.cours))}</b>
              {/* LE SIGNE EST ÉCRIT, pas seulement teinté : qui ne distingue
                  pas le vert du rouge lit « −3,1 % » et sait tout. */}
              <span className={`${styles.pilule} ${l.variationPct > 0 ? styles.hausse : styles.baisse}`}>
                {l.variationPct > 0 ? "+" : "−"}
                {Math.abs(l.variationPct).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
