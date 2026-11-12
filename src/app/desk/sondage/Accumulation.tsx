"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmt, fmtPct } from "@/lib/format";
import type { AnalyseDeGroupe } from "@/lib/domain/sondage-analyse";
import { Reponses } from "./Reponses";
import styles from "./page.module.css";

/**
 * « CE QUI S'ACCUMULE » : UN TABLEAU POUR ANALYSER, ET UN VOLET POUR LE DÉTAIL (12 novembre 2026, planche « Annonces », choix 2A).
 *
 * Une ligne par sondage, avec l'origine (une question du desk ou des demandes de clients), le nombre de clients, le ferme et le possible, le taux minimal, moyen et maximal, le prix
 * minimal et la fraîcheur de la dernière réponse. On clique une ligne : le volet donne ce qui la fonde (la répartition du taux demandé, l'échelle de la demande, chaque réponse avec son client)
 * et un export CSV pour conduire l'analyse ailleurs. Le tableau garde la place de toutes les lignes ; le volet n'en montre qu'une.
 */
export function Accumulation({ groupes }: { groupes: AnalyseDeGroupe[] }) {
  const t = useT();
  const { fmtDate } = useDates();
  const [cle, setCle] = useState(groupes[0]?.cle ?? "");
  const g = groupes.find((x) => x.cle === cle) ?? groupes[0];
  const niveau = (v?: number) => (v == null ? "—" : fmtPct(v, 2));
  const plus = Math.max(1, ...(g?.repartition.map((c) => c.montant) ?? [1]));

  return (
    <div className={styles.accumulation}>
      <div className={styles.defile}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("Origine")}</th>
              <th>{t("Ligne")}</th>
              <th className={styles.n}>{t("Clients")}</th>
              <th className={styles.n}>{t("Ferme")}</th>
              <th className={styles.n}>{t("Possible")}</th>
              <th>{t("Taux min · moyen · max")}</th>
              <th className={styles.n}>{t("Prix min")}</th>
              <th>{t("Dernière réponse")}</th>
              <th>{t("Seuil")}</th>
            </tr>
          </thead>
          <tbody>
            {groupes.map((x) => (
              <tr key={x.cle} className={x.cle === g?.cle ? styles.choisie : undefined} aria-selected={x.cle === g?.cle}>
                <td>
                  <span className={x.origine === "desk" ? styles.pilDesk : styles.pilClients}>{x.origine === "desk" ? t("sondage du desk") : t("clients")}</span>
                  {x.refDesk && <small className={`mono ${styles.refPetite}`}>{x.refDesk}</small>}
                </td>
                <td>
                  <button type="button" className={styles.ligneBtn} onClick={() => setCle(x.cle)}>
                    {x.instrument} · {t(x.country)} · {x.tenor}
                  </button>
                </td>
                <td className={styles.n}>
                  {x.clientsFermes}
                  {x.clients > x.clientsFermes ? <small className={styles.muet}> / {x.clients}</small> : null}
                </td>
                <td className={styles.n}>
                  {fmt(x.ferme)}
                  {x.cherche ? <small className={styles.muet}> / {fmt(x.cherche)}</small> : null}
                </td>
                <td className={styles.n}>{x.possible > x.ferme ? fmt(x.possible) : "—"}</td>
                <td>
                  {x.tauxMin == null ? "—" : `${niveau(x.tauxMin)} · ${niveau(x.tauxMoyen)} · ${niveau(x.tauxMax)}`}
                </td>
                <td className={styles.n}>{x.prixMin != null ? `${x.prixMin.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : "—"}</td>
                <td>{x.age == null ? t("aucune") : x.age === 0 ? t("aujourd'hui") : t("il y a {n} j", { n: String(x.age) })}</td>
                <td>{x.atteint ? t("atteint") : t("sous le seuil")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {g && (
        <aside className={styles.volet} aria-label={t("Détail du sondage")}>
          <h3>
            {g.instrument} · {t(g.country)} · {g.tenor}
          </h3>
          <dl className={styles.kv}>
            <dt>{t("Origine")}</dt>
            <dd>{g.origine === "desk" ? `${t("sondage du desk")}${g.refDesk ? ` · ${g.refDesk}` : ""}` : t("demandes de clients")}</dd>
            <dt>{t("Clients")}</dt>
            <dd>{g.clients === g.clientsFermes ? g.clients : t("{f} fermes sur {n}", { f: String(g.clientsFermes), n: String(g.clients) })}</dd>
            <dt>{t("Ferme")}</dt>
            <dd>{fmt(g.ferme)} FCFA</dd>
            <dt>{t("Taux")}</dt>
            <dd>{g.tauxMin == null ? "—" : `${niveau(g.tauxMin)} · ${niveau(g.tauxMoyen)} · ${niveau(g.tauxMax)}`}</dd>
            <dt>{t("Prix min")}</dt>
            <dd>{g.prixMin != null ? `${g.prixMin.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : "—"}</dd>
            <dt>{t("Au plus tôt")}</dt>
            <dd>{g.auPlusTot ? fmtDate(g.auPlusTot, false) : "—"}</dd>
          </dl>

          {g.repartition.length > 0 && (
            <>
              <h4>{t("Répartition du taux demandé")}</h4>
              <ul className={styles.barres}>
                {g.repartition.map((c) => (
                  <li key={c.de}>
                    <span>{c.de === c.a ? fmtPct(c.de, 2) : `${fmtPct(c.de, 2)} – ${fmtPct(c.a, 2)}`}</span>
                    <i style={{ width: `${Math.round((100 * c.montant) / plus)}%` }} />
                    <b>{fmt(c.montant)}</b>
                  </li>
                ))}
              </ul>
            </>
          )}

          {g.echelle.length > 0 && (
            <>
              <h4>{t("À ce taux ou mieux")}</h4>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("Taux")}</th>
                    <th className={styles.n}>{t("Demande tenue")}</th>
                    <th className={styles.n}>{t("Clients")}</th>
                  </tr>
                </thead>
                <tbody>
                  {g.echelle.map((r) => (
                    <tr key={String(r.limite)}>
                      <td>{r.limite == null ? t("sans condition") : fmtPct(r.limite, 2)}</td>
                      <td className={styles.n}>{fmt(r.tenu)}</td>
                      <td className={styles.n}>{r.clients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h4>{t("Les réponses, une par une")}</h4>
          <Reponses reponses={g.reponses} />
          <a className={styles.exporter} href={`/desk/sondage/export?cle=${encodeURIComponent(g.cle)}`}>
            {t("Exporter ce sondage en CSV")}
          </a>
        </aside>
      )}
    </div>
  );
}
