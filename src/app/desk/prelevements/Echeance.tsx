"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import { preparerLEcheance, remettreALaBanque, type PrelevementResult } from "./actions";
import styles from "./page.module.css";

export interface LigneDEcheance {
  mandatRef: string;
  client: string;
  objet: "provision" | "instruction";
  detail?: string;
  amount: number;
  plafond: number;
  banque: string;
  compte: string;
  /** L'état du préavis : absent tant que l'échéance n'est pas préparée. */
  preavis?: { parti: boolean; le?: string; erreur?: string };
}

export interface LigneEcartee {
  mandatRef: string;
  client: string;
  raison: string;
  montant?: number;
}

/**
 * L'ÉCHÉANCE, SES DEUX GESTES, ET CE QU'ELLE ÉCARTE.
 *
 * Les écartés sont dans le même panneau que les retenus, et c'est le point de
 * cette page. Un mandat qui ne tire pas est silencieux par nature : le client
 * croit son épargne alimentée, le desk voit une liste plus courte sans savoir
 * qu'elle l'est, et le mois passe.
 */
export function Echeance({
  dueOn,
  dueOnLabel,
  lignes,
  ecartes,
  remise,
  remettable,
  enAttenteDePreavis,
}: {
  dueOn: string;
  /** La date déjà mise en forme AU SERVEUR : la langue d un composant client
      rendu côté serveur n est pas celle de la page, et une date française dans
      une page anglaise est le défaut d hydratation déjà mesuré. */
  dueOnLabel: string;
  lignes: LigneDEcheance[];
  ecartes: LigneEcartee[];
  remise?: { ref: string; remiseLe?: string };
  remettable: number;
  enAttenteDePreavis: number;
}) {
  const t = useT();
  const [prep, prepAct, enPrep] = useActionState<PrelevementResult | null, FormData>(preparerLEcheance, null);
  const [rem, remAct, enRem] = useActionState<PrelevementResult | null, FormData>(remettreALaBanque, null);
  const total = lignes.reduce((s, l) => s + l.amount, 0);
  const annonce = lignes.some((l) => l.preavis);

  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{t("L'échéance du {d}", { d: dueOnLabel })}</h2>
        <span className="muted">{t("Rien ne part sans que son préavis soit parti, et pas avant {n} jours.", { n: "5" })}</span>
      </div>

      {lignes.length === 0 ? (
        <div className={styles.pb}>
          <p className={styles.vide}>{t("Aucun mandat ne se présente à cette échéance.")}</p>
        </div>
      ) : (
        <div className={styles.rows}>
          {lignes.map((l) => (
            <div key={l.mandatRef} className={styles.row}>
              <div className={styles.cQui}>
                {l.client}
                <small className="mono">{l.mandatRef}</small>
              </div>
              <div className={styles.cObjet}>
                {l.objet === "provision" ? t("Provision") : t("Épargne programmée")}
                {l.detail && <small>{l.detail}</small>}
              </div>
              <div className={styles.cMontant}>
                <b>{fmt(l.amount)}</b>
                <small>{t("plafond {m}", { m: fmt(l.plafond) })}</small>
              </div>
              <div className={styles.cCompte}>
                {l.banque}
                <small className="mono">{l.compte}</small>
              </div>
              <div className={styles.cEtat}>
                {!l.preavis ? (
                  <span className={styles.vGris}>{t("à annoncer")}</span>
                ) : l.preavis.parti ? (
                  <span className={styles.vOk}>{t("préavis parti")}</span>
                ) : (
                  <>
                    <span className={styles.vNon}>{t("préavis non parti")}</span>
                    <small>{l.preavis.erreur ?? t("aucun canal joignable")}</small>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {ecartes.length > 0 && (
        <div className={styles.ecartes}>
          <h3>{t("Écartés d'office, et pourquoi")}</h3>
          <ul>
            {ecartes.map((e) => (
              <li key={e.mandatRef}>
                <b>
                  {e.client} · <span className="mono">{e.mandatRef}</span>
                </b>{" "}
                {e.raison}
                {e.montant != null && ` (${fmt(e.montant)} FCFA)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.pied}>
        <form action={prepAct}>
          <input type="hidden" name="dueOn" value={dueOn} />
          <button className="btn" disabled={enPrep || !lignes.length}>
            {enPrep ? "…" : annonce ? t("Relancer les préavis non partis") : t("Préparer et annoncer ({n})", { n: String(lignes.length) })}
          </button>
        </form>
        <form action={remAct}>
          <input type="hidden" name="dueOn" value={dueOn} />
          <button className="btn primary" disabled={enRem || remettable === 0 || remise?.remiseLe != null}>
            {enRem ? "…" : t("Remettre à la banque ({n})", { n: String(remettable) })}
          </button>
        </form>
        {remise?.remiseLe ? (
          <p className={styles.note}>{t("Remise {r} partie le {d}. Le fichier se retélécharge ci-dessous.", { r: remise.ref, d: remise.remiseLe })}</p>
        ) : (
          <p className={styles.note}>
            {t("{n} prêts sur {total} · {m} FCFA", { n: String(remettable), total: String(lignes.length), m: fmt(total) })}
            {enAttenteDePreavis > 0 && ` · ${t("{n} attendent que leur préavis parte", { n: String(enAttenteDePreavis) })}`}
          </p>
        )}
      </div>

      {(prep || rem) && (
        <div className={styles.pbMince}>
          {prep && <p className={prep.ok ? styles.ok : styles.ko}>{prep.ok ? prep.message : prep.error}</p>}
          {rem && <p className={rem.ok ? styles.ok : styles.ko}>{rem.ok ? rem.message : rem.error}</p>}
        </div>
      )}
    </section>
  );
}
