"use client";

import type { ReactNode } from "react";
import { useFold } from "@/components/Fold";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

export interface FundGroup {
  id: string;
  label: string;
  note: string;
  count: number;
  open: number; // fonds distribués du groupe
  rows: ReactNode;
}

/**
 * Les fonds, rangés par société de gestion ou par dépositaire.
 *
 * Quinze lignes à plat se lisent encore ; à cinquante, la seule question du
 * desk (« qui gère quoi, et chez qui est-ce déposé ») demande de parcourir la
 * colonne du milieu ligne à ligne. Un pli par groupe la répond d'un regard,
 * et ce qui est replié le reste sur ce poste : `useFold` est la même mémoire
 * que les sections du Guichet, pas une seconde.
 *
 * Les lignes sont rendues par le serveur et passées telles quelles : la
 * fiche, les formulaires de distribution et leurs actions ne changent pas
 * parce qu'on les range autrement.
 */
export function FundGroups({ groups, cols }: { groups: FundGroup[]; cols: number }) {
  return (
    <tbody>
      {groups.map((g) => (
        <FundGroupRows key={g.id} g={g} cols={cols} />
      ))}
    </tbody>
  );
}

function FundGroupRows({ g, cols }: { g: FundGroup; cols: number }) {
  const t = useT();
  const { open, toggle } = useFold("desk-fonds", g.id);
  return (
    <>
      <tr className={styles.groupRow}>
        <th colSpan={cols} scope="colgroup">
          <button type="button" onClick={toggle} aria-expanded={open}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className={open ? styles.chevOpen : undefined}>
              <path d="M6 9l6 6 6-6" />
            </svg>
            <b>{g.label}</b>
            <small>{t("{n} fonds · {m} ouvert(s)", { n: g.count, m: g.open })}</small>
            <small className={styles.groupNote}>{g.note}</small>
          </button>
        </th>
      </tr>
      {open && g.rows}
    </>
  );
}
