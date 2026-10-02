"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmt, fmtDate } from "@/lib/format";
import { payerRestitution, refuserRestitution, type PayoutResult } from "./payout-actions";
import styles from "./page.module.css";

/**
 * La file des demandes de versement, et sa réponse à côté d'elle.
 *
 * Le disponible d'aujourd'hui est montré à côté du montant demandé, parce que
 * c'est lui qui sera viré : l'opérateur doit voir l'écart AVANT de cliquer, et
 * non le découvrir dans le message de retour.
 *
 * Le refus demande son motif dans un champ qui s'ouvre, et le bouton reste
 * désactivé tant qu'il est vide. C'est l'argent du client que la maison garde ;
 * la base l'exige aussi, et l'écran ne doit pas laisser produire une erreur de
 * contrainte là où il peut poser la question.
 */
export function Versements({ demandes }: { demandes: { id: string; nom: string; askedAt: string; askedAmount: number; dispo: number; note?: string }[] }) {
  const t = useT();
  const [pRes, payer, pPending] = useActionState<PayoutResult | null, FormData>(payerRestitution, null);
  const [rRes, refuser, rPending] = useActionState<PayoutResult | null, FormData>(refuserRestitution, null);
  const [refus, setRefus] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const res = pRes ?? rRes;

  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{t("Versements demandés")}</h2>
        <span className="muted">{t("Le solde d'un client lui appartient et reste tant qu'il le souhaite. Quand il le réclame, la demande s'inscrit ici.")}</span>
      </div>
      <div className="scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("Demandé le")}</th>
              <th>{t("Client")}</th>
              <th className="r">{t("Montant demandé")}</th>
              <th className="r">{t("Disponible aujourd'hui")}</th>
              <th>{t("Note du client")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => {
              const ecart = Math.round(d.dispo) - Math.round(d.askedAmount);
              return (
                <tr key={d.id}>
                  <td>{fmtDate(d.askedAt)}</td>
                  <td>{d.nom}</td>
                  <td className="r">{fmt(Math.round(d.askedAmount))}</td>
                  <td className="r">
                    <b>{fmt(Math.round(d.dispo))}</b>
                    {/* L'écart se voit avant le clic : c'est ce montant-ci qui part. */}
                    {ecart !== 0 && (
                      <>
                        {" "}
                        <span className={styles.ecartVif}>
                          {ecart > 0 ? "+" : "−"}
                          {fmt(Math.abs(ecart))}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="muted">{d.note ?? "—"}</td>
                  <td>
                    {refus === d.id ? (
                      <form action={refuser} className={styles.refus}>
                        <input type="hidden" name="payoutId" value={d.id} />
                        <input name="reason" required minLength={3} maxLength={240} placeholder={t("Pourquoi la maison garde ce solde")} value={motif} onChange={(e) => setMotif(e.target.value)} />
                        <button className="btn sm ghost" type="button" onClick={() => setRefus(null)}>
                          {t("Annuler")}
                        </button>
                        <button className="btn sm" type="submit" disabled={rPending || motif.trim().length < 3}>
                          {rPending ? "…" : t("Refuser")}
                        </button>
                      </form>
                    ) : (
                      <div className={styles.encaisser}>
                        <form action={payer}>
                          <input type="hidden" name="payoutId" value={d.id} />
                          <button className="btn sm primary" type="submit" disabled={pPending || d.dispo <= 0}>
                            {pPending ? "…" : t("Verser {m}", { m: fmt(Math.round(d.dispo)) })}
                          </button>
                        </form>
                        <button className="btn sm ghost" type="button" onClick={() => setRefus(d.id)}>
                          {t("Refuser…")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {res && <p className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</p>}
    </section>
  );
}
