"use client";

import { useT } from "@/i18n/client";
import { COUNTRY_CODE } from "@/lib/domain/summary";
import type { Country } from "@/lib/domain/types";
import { Drapeau } from "./Drapeau";
import styles from "./PastillesPays.module.css";

/**
 * LES PASTILLES DES TRÉSORS, AVEC LEUR DRAPEAU (3 novembre 2026, puis 4 novembre : « les drapeaux des pays et non une
 * seule couleur »). Sur la section des États (48 lignes), six pastilles — une par Trésor — portent le drapeau du pays
 * (`Drapeau`), le même que celui de chaque ligne. Toucher une pastille ne garde que ce Trésor ; la retoucher les rend tous.
 * Le code du pays et le nombre de lignes sont écrits : le dessin ne porte rien seul.
 */
export function PastillesPays({ pays, selected, onChange }: { pays: { pays: Country; n: number }[]; selected: Set<string>; onChange: (p: Country | undefined) => void }) {
  const t = useT();
  return (
    <div className={styles.rangee} role="group" aria-label={t("Pays")}>
      {pays.map((x) => {
        const ici = selected.has(x.pays);
        return (
          <button key={x.pays} type="button" aria-pressed={ici} disabled={x.n === 0} className={ici ? styles.on : undefined} onClick={() => onChange(ici && selected.size === 1 ? undefined : x.pays)} title={t(x.pays)}>
            <Drapeau pays={x.pays} largeur={18} />
            {COUNTRY_CODE[x.pays]} <b>{x.n}</b>
          </button>
        );
      })}
    </div>
  );
}
