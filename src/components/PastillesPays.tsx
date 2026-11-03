"use client";

import { useT } from "@/i18n/client";
import { COUNTRY_CODE } from "@/lib/domain/summary";
import type { Country } from "@/lib/domain/types";
import { COUNTRY_COLOR } from "@/lib/market/couleurs";
import styles from "./PastillesPays.module.css";

/**
 * LES PASTILLES DES TRÉSORS, À LA COULEUR DE LEUR PAYS (3 novembre 2026).
 *
 * « Rajouter également les pastilles couleur pays pour les États. » Sur la section des États (48 lignes), six
 * pastilles — une par Trésor — dans la couleur que la maison lui donne partout (`COUNTRY_COLOR`, celle de la
 * courbe et des légendes) : une couleur suit un émetteur, jamais un rang. Toucher une pastille ne garde que ce
 * Trésor ; la retoucher les rend tous. Le code du pays et le nombre de lignes sont écrits : la teinte ne porte
 * rien seule.
 */
export function PastillesPays({ pays, selected, onChange }: { pays: { pays: Country; n: number }[]; selected: Set<string>; onChange: (p: Country | undefined) => void }) {
  const t = useT();
  return (
    <div className={styles.rangee} role="group" aria-label={t("Pays")}>
      {pays.map((x) => {
        const ici = selected.has(x.pays);
        return (
          <button key={x.pays} type="button" aria-pressed={ici} disabled={x.n === 0} className={ici ? styles.on : undefined} onClick={() => onChange(ici && selected.size === 1 ? undefined : x.pays)} title={t(x.pays)}>
            <i className={styles.rond} style={{ background: COUNTRY_COLOR[x.pays] }} aria-hidden="true" />
            {COUNTRY_CODE[x.pays]} <b>{x.n}</b>
          </button>
        );
      })}
    </div>
  );
}
