"use client";

import { Fragment, useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmtPct, fmtUnits } from "@/lib/format";
import type { ReponseDeSondage } from "@/lib/domain/sondage-analyse";
import { Reponses } from "./Reponses";
import { Statuer } from "./Formulaires";
import styles from "./page.module.css";

export interface QuestionOuverte {
  id: string;
  ref: string;
  ligne: string;
  posee: string;
  horizon?: string;
  cherche: number;
  recu: number;
  tauxMin?: number;
  prixMin?: number;
  age?: number;
  reponses: ReponseDeSondage[];
}

/**
 * LES QUESTIONS OUVERTES, EN TABLEAU (12 novembre 2026, planche « Annonces », choix 3A) : une question par ligne, ce qui est cherché et ce qui est reçu, le taux et le prix
 * minimaux, la fraîcheur de la dernière réponse. Les réponses se déplient sous la ligne, et « Clore » est sur la ligne : il ouvre sa relecture (le motif est demandé avant, le client le lit).
 */
export function Questions({ questions }: { questions: QuestionOuverte[] }) {
  const t = useT();
  const { fmtDate } = useDates();
  const [ouverte, setOuverte] = useState<string | null>(null);
  return (
    <div className={styles.defile}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("Réf.")}</th>
            <th>{t("Ligne")}</th>
            <th>{t("Posée le")}</th>
            <th>{t("Horizon")}</th>
            <th className={styles.n}>{t("Cherché")}</th>
            <th className={styles.n}>{t("Reçu")}</th>
            <th className={styles.n}>{t("Réponses")}</th>
            <th className={styles.n}>{t("Taux min")}</th>
            <th className={styles.n}>{t("Prix min")}</th>
            <th>{t("Dernière réponse")}</th>
            <th>{t("Clore")}</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <Fragment key={q.id}>
              <tr>
                <td className="mono">{q.ref}</td>
                <td>
                  <button type="button" className={styles.ligneBtn} aria-expanded={ouverte === q.id} onClick={() => setOuverte(ouverte === q.id ? null : q.id)}>
                    {q.ligne}
                  </button>
                </td>
                <td>{fmtDate(q.posee.slice(0, 10), false)}</td>
                <td>{q.horizon ? fmtDate(q.horizon, false) : "—"}</td>
                <td className={styles.n}>{fmtUnits(q.cherche)}</td>
                <td className={styles.n}>{fmtUnits(q.recu)}</td>
                <td className={styles.n}>{q.reponses.length}</td>
                <td className={styles.n}>{q.tauxMin != null ? fmtPct(q.tauxMin, 2) : "—"}</td>
                <td className={styles.n}>{q.prixMin != null ? `${q.prixMin.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : "—"}</td>
                <td>{q.age == null ? t("aucune") : q.age === 0 ? t("aujourd'hui") : t("il y a {n} j", { n: String(q.age) })}</td>
                <td>
                  <Statuer id={q.id} ref_={q.ref} reponses={q.reponses.length} />
                </td>
              </tr>
              {ouverte === q.id && (
                <tr>
                  <td colSpan={11}>
                    <Reponses reponses={q.reponses} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
