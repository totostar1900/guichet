"use client";

import { useDates, useT } from "@/i18n/client";
import { fmtPct, fmtUnits } from "@/lib/format";
import type { ReponseDeSondage } from "@/lib/domain/sondage-analyse";
import styles from "./page.module.css";

/**
 * LES RÉPONSES, UNE PAR UNE, avec ce que le desk sait du client (12 novembre 2026) : le même tableau sous une demande qui s'accumule et sous une question ouverte.
 * Le desk ne corrige pas la réponse d'un client : elle est à lui, et une demande retouchée par la maison ne serait plus un renseignement. Il la lit.
 */
export function Reponses({ reponses }: { reponses: ReponseDeSondage[] }) {
  const t = useT();
  const { fmtDate } = useDates();
  if (reponses.length === 0) return <p className={styles.muet}>{t("Aucune réponse encore.")}</p>;
  return (
    <div className={styles.defile}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("Client")}</th>
            <th>{t("Segment")}</th>
            <th className={styles.n}>{t("Montant")}</th>
            <th className={styles.n}>{t("Taux")}</th>
            <th className={styles.n}>{t("Prix")}</th>
            <th>{t("Prêt le")}</th>
            <th>{t("Reçue le")}</th>
            <th>{t("Réf.")}</th>
          </tr>
        </thead>
        <tbody>
          {reponses.map((r) => (
            <tr key={r.id}>
              <td>
                {r.client}
                {r.modifiee && <small className={styles.modifiee}>{r.modifiee}</small>}
              </td>
              <td>{r.segment ?? "—"}</td>
              <td className={styles.n}>{fmtUnits(r.montant)}</td>
              <td className={styles.n}>{r.taux != null ? fmtPct(r.taux, 2) : "—"}</td>
              <td className={styles.n}>{r.prix != null ? `${r.prix.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : "—"}</td>
              <td>{r.preteLe ? fmtDate(r.preteLe, false) : "—"}</td>
              <td>{fmtDate(r.recueLe.slice(0, 10), false)}</td>
              <td className="mono">{r.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
