"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmtDate } from "@/lib/format";
import { reprendreRappelAction, type RelancePolitiqueResult } from "./actions";
import styles from "./page.module.css";

export interface LigneEcartee {
  id: string;
  qui: string;
  sujet: string;
  envois: number;
  motif?: string;
  le: string;
}

/**
 * CEUX QUI ONT DEMANDÉ QU'ON SE TAISE, ET LE SEUL CHEMIN POUR REVENIR DESSUS.
 *
 * Le bouton existe parce que le téléphone existe : un client appelle et dit
 * « finalement relancez-moi ». Sans lui, la seule issue serait de manipuler
 * la base, ce qui ne laisse aucune trace lisible.
 *
 * IL DEMANDE UN MOTIF, et ce n'est pas une formalité. Rallumer des messages
 * que quelqu'un a fait taire est exactement le geste qu'on doit pouvoir
 * retrouver six mois plus tard, avec le nom de qui l'a pressé et la raison
 * qu'il a donnée. Le champ est donc obligatoire, et l'action le refuse vide.
 */
export function Ecartes({ rows }: { rows: LigneEcartee[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<RelancePolitiqueResult | null, FormData>(reprendreRappelAction, null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  if (!rows.length) return <p className={styles.vide}>{t("Personne n'a interrompu ses rappels.")}</p>;

  return (
    <>
      <table className={styles.file}>
        <thead>
          <tr>
            <th>{t("Client")}</th>
            <th>{t("Sujet")}</th>
            <th>{t("Interrompu le")}</th>
            <th>{t("Reçus avant")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id}>
              <td>{x.qui}</td>
              <td>
                {t(x.sujet)}
                {x.motif && <div className="muted">{x.motif}</div>}
              </td>
              <td>{fmtDate(x.le)}</td>
              <td>{x.envois}</td>
              <td>
                {ouvert === x.id ? (
                  <form action={action} className={styles.row}>
                    <input type="hidden" name="id" value={x.id} />
                    <input name="motif" placeholder={t("À la demande du client, le …")} required minLength={4} maxLength={200} />
                    <button className="btn sm" type="submit" disabled={pending}>
                      {t("Reprendre")}
                    </button>
                    <button className="btn sm ghost" type="button" onClick={() => setOuvert(null)}>
                      {t("Annuler")}
                    </button>
                  </form>
                ) : (
                  <button className="btn sm ghost" type="button" onClick={() => setOuvert(x.id)}>
                    {t("Reprendre")}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {state && <p className={state.ok ? styles.ok : styles.ko}>{state.ok ? t(state.message) : t(state.error)}</p>}
    </>
  );
}
