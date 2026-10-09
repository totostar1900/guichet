"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import { MOTIFS, type MotifDeRejet } from "@/lib/domain/prelevement";
import { direLeSort, reactiverLeMandat, type PrelevementResult } from "./actions";
import styles from "./page.module.css";

export interface TirageVu {
  id: string;
  ref: string;
  mandatRef: string;
  client: string;
  amount: number;
  /** Mise en forme au serveur : voir Echeance.tsx. */
  dueOn: string;
  age: number;
  sansNouvelle: boolean;
}

export interface SuspenduVu {
  id: string;
  ref: string;
  client: string;
  rejets: number;
}

/**
 * LE SORT DE CHAQUE LIGNE REMISE, et la réactivation d'un mandat suspendu.
 *
 * Trois issues, et la troisième est l'absence des deux autres : tant que rien
 * n'est inscrit, l'argent n'existe nulle part. « Sans nouvelle » est calculé
 * par la page, pas rangé en base, parce qu'il dépend du jour où on regarde.
 *
 * Le motif d'un rejet s'ouvre à la place des boutons, et il est obligatoire :
 * un rejet sans cause ne décide de rien, puisque c'est la cause qui dit si on
 * représente ou si on suspend.
 */
export function Sorts({ file, suspendus }: { file: TirageVu[]; suspendus: SuspenduVu[] }) {
  const t = useT();
  const [sort, sortAct, enCours] = useActionState<PrelevementResult | null, FormData>(direLeSort, null);
  const [reac, reacAct, enReac] = useActionState<PrelevementResult | null, FormData>(reactiverLeMandat, null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [motif, setMotif] = useState<MotifDeRejet>("provision_insuffisante");

  return (
    <>
      <section className="panel">
        <div className="panel-h">
          <h2>{t("Remises en attente de sort")}</h2>
          <span className="muted">{t("Un tirage remis a trois issues. Tant qu'aucune n'est inscrite, l'argent n'existe nulle part.")}</span>
        </div>
        {file.length === 0 ? (
          <div className={styles.pb}>
            <p className={styles.vide}>{t("Rien n'attend son sort.")}</p>
          </div>
        ) : (
          <div className={styles.rows}>
            {file.map((x) => (
              <form key={x.id} action={sortAct} className={`${styles.row} ${x.sansNouvelle ? styles.rowAlerte : ""}`}>
                <input type="hidden" name="id" value={x.id} />
                <div className={styles.cQui}>
                  {x.client}
                  <small className="mono">{x.mandatRef}</small>
                </div>
                <div className={styles.cObjet}>
                  {t("échéance du {d}", { d: x.dueOn })}
                  <small className="mono">{x.ref}</small>
                </div>
                <div className={styles.cMontant}>
                  <b>{fmt(x.amount)}</b>
                </div>
                <div className={styles.cEtat}>
                  {x.sansNouvelle ? (
                    <>
                      <span className={styles.vNon}>{t("sans nouvelle · {n} jours", { n: String(x.age) })}</span>
                      <small>{t("Remis, ni crédité ni rejeté. C'est la banque qu'on appelle.")}</small>
                    </>
                  ) : (
                    <span className={styles.vGris}>{t("remis il y a {n} jours", { n: String(x.age) })}</span>
                  )}
                </div>
                <div className={styles.cGeste}>
                  {ouvert === x.id ? (
                    <div className={styles.refus}>
                      {/* La liste native est assumée au desk : grand écran, clavier. */}
                      <select name="motif" value={motif} onChange={(e) => setMotif(e.target.value as MotifDeRejet)} aria-label={t("Motif du rejet")}>
                        {(Object.keys(MOTIFS) as MotifDeRejet[]).map((k) => (
                          <option key={k} value={k}>
                            {t(MOTIFS[k].libelle)}
                          </option>
                        ))}
                      </select>
                      <input name="note" placeholder={t("Le code de la banque, si elle en donne un")} maxLength={200} />
                      <button type="button" className="btn sm ghost" onClick={() => setOuvert(null)}>
                        {t("Annuler")}
                      </button>
                      <button name="sort" value="rejete" className="btn sm" disabled={enCours}>
                        {t("Inscrire le rejet")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button name="sort" value="encaisse" className="btn sm primary" disabled={enCours}>
                        {t("Encaissé")}
                      </button>
                      <button type="button" className="btn sm" onClick={() => setOuvert(x.id)}>
                        {t("Rejeté…")}
                      </button>
                    </>
                  )}
                </div>
              </form>
            ))}
          </div>
        )}
        {sort && (
          <div className={styles.pbMince}>
            <p className={sort.ok ? styles.ok : styles.ko}>{sort.ok ? sort.message : sort.error}</p>
          </div>
        )}
      </section>

      {suspendus.length > 0 && (
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Mandats suspendus")}</h2>
            <span className="muted">{t("Ils ne se réactivent pas tout seuls : un mot au client d'abord, le bouton ensuite.")}</span>
          </div>
          <div className={styles.rows}>
            {suspendus.map((m) => (
              <form key={m.id} action={reacAct} className={styles.row}>
                <input type="hidden" name="id" value={m.id} />
                <div className={styles.cQui}>
                  {m.client}
                  <small className="mono">{m.ref}</small>
                </div>
                <div className={styles.cObjet}>{t("{n} rejet(s) consécutifs", { n: String(m.rejets) })}</div>
                <div className={styles.cMontant} />
                <div className={styles.cEtat} />
                <div className={styles.cGeste}>
                  <button className="btn sm" disabled={enReac}>
                    {t("Réactiver")}
                  </button>
                </div>
              </form>
            ))}
          </div>
          {reac && (
            <div className={styles.pbMince}>
              <p className={reac.ok ? styles.ok : styles.ko}>{reac.ok ? reac.message : reac.error}</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
