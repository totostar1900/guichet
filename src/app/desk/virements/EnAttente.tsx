"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmt, fmtDate } from "@/lib/format";
import { JOURS_AVANT_ALERTE } from "@/lib/domain/virement";
import { trancherLeCredit, type VirementResult } from "./actions";
import type { ClientVu } from "./LireLeReleve";
import styles from "./page.module.css";

export interface AttenteVu {
  id: string;
  at: string;
  amount: number;
  payer: string;
  motif?: string;
  age: number;
  /** Le client que la machine propose, quand un seul caractère sépare le motif d'une référence. */
  propose?: { userId: string; nom: string; ref: string };
}

/**
 * LA FILE DE CE QUI EST ARRIVÉ SANS NOM.
 *
 * Elle se range par ancienneté, parce que c'est l'âge qui appelle quelqu'un :
 * un crédit de la veille attend normalement, un crédit de six jours est un
 * client qui regarde une page vide en se demandant où est son argent. Le
 * montant ne range rien ici, et c'est délibéré.
 *
 * Deux gestes seulement, et aucun des deux n'est automatique. Appeler le client
 * est ce qui se passe entre les deux, et aucune page ne peut le faire.
 */
export function EnAttente({ file, clients }: { file: AttenteVu[]; clients: ClientVu[] }) {
  const t = useT();
  const [etat, action, enCours] = useActionState<VirementResult | null, FormData>(trancherLeCredit, null);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [motifOuvert, setMotifOuvert] = useState<string | null>(null);

  if (!file.length) return <p className={styles.vide}>{t("Rien n'attend un nom. C'est l'état normal, et il se vérifie en un coup d'œil.")}</p>;

  return (
    <>
      <div className={styles.rows}>
        {file.map((v) => {
          const choisi = choix[v.id] ?? v.propose?.userId ?? "";
          return (
            <form key={v.id} action={action} className={styles.row}>
              <input type="hidden" name="id" value={v.id} />
              <div className={styles.cellJour}>
                <b className={v.age > JOURS_AVANT_ALERTE ? styles.alerte : undefined}>{t("{n} jours", { n: String(v.age) })}</b>
                <small>{fmtDate(v.at)}</small>
              </div>
              <div className={styles.cellMontant}>{fmt(v.amount)}</div>
              <div className={styles.cellQui}>
                {v.payer}
                <small className="mono">{v.motif ?? t("motif vide")}</small>
              </div>
              <div className={styles.cellClient}>
                <select name="userId" value={choisi} onChange={(e) => setChoix((c) => ({ ...c, [v.id]: e.target.value }))} aria-label={t("Client")}>
                  <option value="">{t("Choisir un client")}</option>
                  {clients.map((c) => (
                    <option key={c.userId} value={c.userId}>
                      {c.nom} · {c.ref}
                    </option>
                  ))}
                </select>
                {v.propose && <small>{t("{nom} ? Un seul caractère sépare ce motif de {ref}.", { nom: v.propose.nom, ref: v.propose.ref })}</small>}
              </div>
              <div className={styles.cellGeste}>
                {motifOuvert === v.id ? (
                  <div className={styles.refus}>
                    <input name="raison" placeholder={t("Pourquoi cet argent repart")} maxLength={160} />
                    <button type="button" className="btn sm ghost" onClick={() => setMotifOuvert(null)}>
                      {t("Annuler")}
                    </button>
                    <button name="geste" value="restituer" className="btn sm" disabled={enCours}>
                      {t("Restituer")}
                    </button>
                  </div>
                ) : (
                  <>
                    <button name="geste" value="rattacher" className="btn sm primary" disabled={enCours || !choisi}>
                      {t("Rattacher")}
                    </button>
                    <button type="button" className="btn sm" onClick={() => setMotifOuvert(v.id)}>
                      {t("Restituer")}
                    </button>
                  </>
                )}
              </div>
            </form>
          );
        })}
      </div>
      {etat && <p className={etat.ok ? styles.ok : styles.ko}>{etat.ok ? etat.message : etat.error}</p>}
    </>
  );
}
