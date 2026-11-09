"use client";

import { useDates, useT } from "@/i18n/client";
import { Drapeau } from "@/components/Drapeau";
import type { Offer } from "@/lib/domain/types";
import { summarize } from "@/lib/domain/summary";
import { fmt, fmtPct, money } from "@/lib/format";
import type { SeanceClient } from "@/lib/market/adjudications-client";
import { aServi } from "@/lib/market/adjudications-client";
import { BoutonsDeSeanceClose, ChevronDeplie, Depliable, Extension, Outils, useDepliee } from "@/components/mobile/CarteDepliee";
import styles from "@/components/OfferCard.module.css";

/**
 * UNE SEULE LISTE POUR LES SÉANCES CLOSES (9 novembre 2026, soir) : un résultat confirmé et une ligne close du catalogue ont la même carte (drapeau, nom, Trésor, date, coupon, chiffre à droite, chevron). Un résultat dont le code d'émission est une ligne du catalogue
 * emprunte à celle-ci son coupon, son échéance et sa fiche ; une ligne close sans résultat montre ce que le catalogue sait d'elle.
 *
 * UNE SÉANCE CLOSE EST UNE LIGNE, SON RÉSULTAT EN EST LE CORPS (9 novembre 2026, planche « Séances closes et résultats », 1A).
 *
 * La séance close n'est pas une offre : on ne crée aucune ligne du catalogue, on montre le résultat que le Desk a relu et confirmé, tel que le communiqué du Trésor l'imprime. La carte a l'anatomie des autres lignes (nom,
 * Trésor et date, chiffre à droite, chevron) ; le chevron déplie les résultats complets. Les champs viennent de `vueClient`, la liste blanche : rien ne s'y ajoute ici. Aucune « sélection » ni proposition du desk sur un
 * résultat. Les dates de règlement et d'échéance ne sont pas dans un résultat : elles ne sont pas écrites.
 */
export type EntreeClose = { type: "resultat"; s: SeanceClient; offre?: Offer; href?: string } | { type: "ligne"; o: Offer; href: string };

export function CarteDeSeanceClose({ e }: { e: EntreeClose }) {
  const t = useT();
  const dates = useDates();
  const { fmtDate } = dates;
  const { ouvert, basculer, replier, idRegion } = useDepliee();
  const r = e.type === "resultat" ? e.s : null;
  const offre = e.type === "ligne" ? e.o : e.offre;
  const maintenant = new Date();
  const sl = offre ? summarize(offre, maintenant, { dates }) : null;
  const bon = r?.instrument === "BTA";
  const moyen = r ? (bon ? r.rateAvg : r.priceAvg) : undefined;
  const [bas, haut] = r ? (bon ? [r.rateMin, r.rateMax] : [r.priceMin, r.priceMax]) : [];
  const limite = r ? (bon ? r.rateLimit : r.priceLimit) : undefined;
  const faits: [string, string][] = [];
  if (r) {
    if (limite != null) faits.push([bon ? "Taux limite" : "Prix limite", fmtPct(limite, 2)]);
    if (bas != null && haut != null) faits.push([bon ? "Taux min – max" : "Prix min – max", `${fmtPct(bas, 2)} – ${fmtPct(haut, 2)}`]);
    if (r.announced != null) faits.push(["Annoncé", money(r.announced)]);
    if (r.bid != null) faits.push(["Soumissions", money(r.bid)]);
    if (r.served != null) faits.push(["Servi", money(r.served)]);
    if (r.coverage != null) faits.push(["Couverture", fmtPct(r.coverage, 0)]);
    if (r.bidders != null) faits.push(["Soumissionnaires", fmt(r.bidders)]);
    if (r.networkSize != null) faits.push(["SVT du réseau", fmt(r.networkSize)]);
    if (sl) faits.push(["Échéance", sl.maturity]);
  } else if (sl) {
    /* LE PRIX SERVI EST LE CHIFFRE, LE RENDEMENT EST DANS L'EXTENSION (planche « Résultats des séances », 2B). */
    faits.push(["Rendement actuariel", sl.hero]);
    for (const [k, v, note] of sl.facts) faits.push([k, note ? `${v} · ${note}` : v]);
  }
  const pays = r ? r.country : (e as { o: Offer }).o.country;
  const nom = r ? `${r.instrument} ${t(r.tenor)}` : t((e as { o: Offer }).o.title);
  const jour = r ? fmtDate(r.sessionOn, false) : sl?.deadlineParts?.[0];
  const coupon = offre?.couponRate;
  /* LA FOURCHETTE EST DITE SOUS LE NOM (9 novembre 2026) : un taux ou un prix « min – max » n'attend plus le chevron. */
  const fourchette = bas != null && haut != null ? t(bon ? "taux {a} – {b}" : "prix {a} – {b}", { a: fmtPct(bas, 2), b: fmtPct(haut, 2) }) : null;
  const sub = [r ? t(r.country) : t((e as { o: Offer }).o.countryName), coupon != null ? t("coupon {c}", { c: fmtPct(coupon, 2) }) : null, fourchette, jour ? (r ? t("séance du {d}", { d: jour }) : t("clôturée le {d}", { d: jour })) : null].filter(Boolean).join(" · ");
  const servi = r ? moyen != null && aServi(r) : true;
  const prixServi = e.type === "ligne" ? e.o.servedPricePct : undefined;
  const chiffre = r ? (servi ? fmtPct(moyen as number, 2) : "—") : prixServi != null ? fmtPct(prixServi, 2) : "—";
  const legende = r ? t(servi ? (bon ? "taux moyen pondéré" : "prix moyen pondéré") : "rien servi") : t("prix servi");
  const code = r ? r.codeEmission : offre?.isin;
  return (
    <Depliable ouvert={ouvert} replier={replier}>
      <article className={`${styles.card} ${styles.compact}`} data-seance-close>
        <div className={styles.cLink}>
          <span className={`${styles.cId}`}>
            <b className={`${styles.cCode} ${styles.cCodeLong}`}>
              <Drapeau pays={pays} largeur={19} /> {nom}
            </b>
            <small className={`${styles.cSub} ${styles.cSubLong}`}>{sub}</small>
          </span>
          <span className={styles.cNum}>
            <b>{chiffre}</b>
            <small>{legende}</small>
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
                {code && <span className={styles.isinCoin}>{code}</span>}
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
          {r && (
            <p className={styles.noteDeSeance}>
              {t("Les montants sont en francs CFA. Un taux ou un prix absent n'a pas été imprimé dans le communiqué.")}
            </p>
          )}
        </div>
        <BoutonsDeSeanceClose href={e.href} />
      </Extension>
    </Depliable>
  );
}
