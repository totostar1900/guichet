"use client";

import { useDates, useT } from "@/i18n/client";
import { fmt, fmtPct, money } from "@/lib/format";
import type { SeanceClient } from "@/lib/market/adjudications-client";
import { aServi } from "@/lib/market/adjudications-client";
import { BoutonsDeSeanceClose, ChevronDeplie, Depliable, Extension, Outils, useDepliee } from "@/components/mobile/CarteDepliee";
import styles from "@/components/OfferCard.module.css";

/**
 * UNE SÉANCE CLOSE EST UNE LIGNE, SON RÉSULTAT EN EST LE CORPS (9 novembre 2026, planche « Séances closes et résultats », 1A).
 *
 * La séance close n'est pas une offre : on ne crée aucune ligne du catalogue, on montre le résultat que le Desk a relu et confirmé, tel que le communiqué du Trésor l'imprime. La carte a l'anatomie des autres lignes (nom,
 * Trésor et date, chiffre à droite, chevron) ; le chevron déplie les résultats complets. Les champs viennent de `vueClient`, la liste blanche : rien ne s'y ajoute ici. Aucune « sélection » ni proposition du desk sur un
 * résultat. Les dates de règlement et d'échéance ne sont pas dans un résultat : elles ne sont pas écrites.
 */
export function CarteDeSeanceClose({ s, href }: { s: SeanceClient; href?: string }) {
  const t = useT();
  const { fmtDate } = useDates();
  const { ouvert, basculer, replier, idRegion } = useDepliee();
  const bon = s.instrument === "BTA";
  const moyen = bon ? s.rateAvg : s.priceAvg;
  const [bas, haut] = bon ? [s.rateMin, s.rateMax] : [s.priceMin, s.priceMax];
  const limite = bon ? s.rateLimit : s.priceLimit;
  const faits: [string, string][] = [];
  if (limite != null) faits.push([bon ? "Taux limite" : "Prix limite", fmtPct(limite, 2)]);
  if (bas != null && haut != null) faits.push([bon ? "Taux min – max" : "Prix min – max", `${fmtPct(bas, 2)} – ${fmtPct(haut, 2)}`]);
  if (s.announced != null) faits.push(["Annoncé", money(s.announced)]);
  if (s.bid != null) faits.push(["Soumissions", money(s.bid)]);
  if (s.served != null) faits.push(["Servi", money(s.served)]);
  if (s.coverage != null) faits.push(["Couverture", fmtPct(s.coverage, 0)]);
  if (s.bidders != null) faits.push(["Soumissionnaires", fmt(s.bidders)]);
  if (s.networkSize != null) faits.push(["SVT du réseau", fmt(s.networkSize)]);
  return (
    <Depliable ouvert={ouvert} replier={replier}>
      <article className={`${styles.card} ${styles.compact}`} data-seance-close>
        <div className={styles.cLink}>
          <span className={`${styles.cId}`}>
            <b className={`${styles.cCode} ${styles.cCodeLong}`}>
              {s.instrument} {t(s.tenor)}
            </b>
            <small className={`${styles.cSub} ${styles.cSubLong}`}>
              {s.country} · {t("séance du {d}", { d: fmtDate(s.sessionOn, false) })}
            </small>
          </span>
          <span className={styles.cNum}>
            <b>{moyen != null && aServi(s) ? fmtPct(moyen, 2) : "—"}</b>
            <small>{t(moyen != null && aServi(s) ? (bon ? "taux moyen pondéré" : "prix moyen pondéré") : "rien servi")}</small>
          </span>
        </div>
        <Outils>
          <ChevronDeplie ouvert={ouvert} onClick={basculer} idRegion={idRegion} />
        </Outils>
      </article>
      <Extension ouvert={ouvert} idRegion={idRegion}>
        <div className={styles.dos}>
          <div className={`${styles.head} ${styles.dosTete}`}>
            <div className={styles.corner}>
              <span className={styles.etat}>
                {s.codeEmission && <span className={styles.isinCoin}>{s.codeEmission}</span>}
                <span className="pill quoted">{t("Close")}</span>
              </span>
            </div>
          </div>
          <div className={styles.resultats}>
            {faits.map(([k, v]) => (
              <div key={k}>
                <span>{t(k)}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <p className={styles.noteDeSeance}>
            {t("Les montants sont en francs CFA. Un taux ou un prix absent n'a pas été imprimé dans le communiqué.")}
          </p>
        </div>
        <BoutonsDeSeanceClose href={href} />
      </Extension>
    </Depliable>
  );
}
