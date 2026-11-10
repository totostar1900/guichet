"use client";

import { useDates, useT } from "@/i18n/client";
import { Drapeau } from "@/components/Drapeau";
import type { Offer } from "@/lib/domain/types";
import { summarize } from "@/lib/domain/summary";
import { displayYield } from "@/lib/domain/status";
import { nomDeSeance } from "@/lib/domain/nom-de-ligne";
import { fmt, fmtPct, money } from "@/lib/format";
import type { SeanceClient } from "@/lib/market/adjudications-client";
import { aServi } from "@/lib/market/adjudications-client";
import { ChevronDeplie, Depliable, Extension, Outils, useDepliee } from "@/components/mobile/CarteDepliee";
import { tenorDays } from "@/lib/market/yield";
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
export type EntreeClose = { type: "resultat"; s: SeanceClient; offre?: Offer } | { type: "ligne"; o: Offer };

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
  const pays = r ? r.country : (e as { o: Offer }).o.country;
  /* LE COUPON EST DANS LE NOM DE TOUTE OBLIGATION, quand il est connu (9 novembre 2026) : le communiqué le donne, ou la ligne du catalogue qui porte le même code d'émission. */
  const coupon = r ? (r.couponRate ?? offre?.couponRate) : offre?.couponRate;
  const echeance = r ? (r.maturityOn ?? offre?.maturityOn) : offre?.maturityOn;
  const nom = r ? (bon ? `BTA ${t(r.tenor)}` : `OTA${coupon != null ? ` ${fmtPct(coupon, 2)}` : ""} · ${t(r.tenor)}`) : t(nomDeSeance((e as { o: Offer }).o.title));
  const jour = r ? fmtDate(r.sessionOn, false) : sl?.deadlineParts?.[0];
  /* LA FOURCHETTE EST DITE SOUS LE NOM : un taux ou un prix « min – max » n'attend plus le chevron. */
  const fourchette = bas != null && haut != null ? t(bon ? "taux {a} – {b}" : "prix {a} – {b}", { a: fmtPct(bas, 2), b: fmtPct(haut, 2) }) : null;
  const sub = [r ? t(r.country) : t((e as { o: Offer }).o.countryName), fourchette, jour ? (r ? t("séance du {d}", { d: jour }) : t("clôturée le {d}", { d: jour })) : null].filter(Boolean).join(" · ");
  const servi = r ? moyen != null && aServi(r) : true;
  /* LE CHIFFRE DE DROITE EST COMPARABLE D'UNE LIGNE À L'AUTRE (9 novembre 2026) : un bon dit son taux moyen pondéré tel que le Trésor l'imprime, une obligation son rendement actuariel. Sans coupon, une obligation ne donne pas de rendement : elle garde son prix, dit comme tel. */
  const rendementLigne = e.type === "ligne" ? displayYield(e.o).pct : null;
  let chiffre = "—";
  let legende = "rien servi";
  if (r) {
    if (servi && bon) [chiffre, legende] = [fmtPct(moyen as number, 2), "taux moyen pondéré"];
    else if (servi && r.rendement != null) [chiffre, legende] = [fmtPct(r.rendement, 2), "rendement actuariel"];
    else if (servi) [chiffre, legende] = [fmtPct(moyen as number, 2), "prix moyen pondéré"];
  } else if (rendementLigne != null) [chiffre, legende] = [fmtPct(rendementLigne, 2), "rendement actuariel"];
  /* LES DÉTAILS, DANS LE MÊME ORDRE POUR TOUTES : le titre (coupon, échéance), le prix et le rendement, la fourchette, puis les montants, réunis deux par deux (annoncé et soumis, servi et couverture, soumissionnaires et SVT). */
  const faits: [string, string][] = [];
  if (!bon) faits.push(["Coupon", coupon != null ? fmtPct(coupon, 2) : "non communiqué"]);
  /* L'ÉCHÉANCE EST TOUJOURS DITE (10 novembre 2026) : la date imprimée ou celle de la ligne ; sinon une date approchée, séance plus durée annoncée, précédée d'un « ~ » ; sinon un tiret. */
  const jours = tenorDays(r?.tenor);
  const approchee = !echeance && r && jours != null ? new Date(Date.parse(r.sessionOn) + jours * 86_400_000).toISOString().slice(0, 10) : null;
  faits.push(["Échéance", echeance ? fmtDate(echeance) : approchee ? `~ ${fmtDate(approchee)}` : "—"]);
  if (r) {
    if (r.rendement != null) faits.push(["Rendement actuariel", fmtPct(r.rendement, 2)]);
    if (!bon && moyen != null) faits.push(["Prix moyen pondéré", fmtPct(moyen, 2)]);
    if (limite != null) faits.push([bon ? "Taux limite" : "Prix limite", fmtPct(limite, 2)]);
    if (bas != null && haut != null) faits.push([bon ? "Taux min – max" : "Prix min – max", `${fmtPct(bas, 2)} – ${fmtPct(haut, 2)}`]);
    if (r.announced != null || r.bid != null) faits.push([r.announced != null && r.bid != null ? "Annoncé / soumissions" : r.announced != null ? "Annoncé" : "Soumissions", [r.announced, r.bid].filter((v): v is number => v != null).map(money).join(" / ")]);
    if (r.served != null || r.coverage != null) faits.push([r.served != null && r.coverage != null ? "Servi / couverture" : r.served != null ? "Servi" : "Couverture", [r.served != null ? money(r.served) : null, r.coverage != null ? fmtPct(r.coverage, 0) : null].filter(Boolean).join(" · ")]);
    if (r.bidders != null || r.networkSize != null) faits.push([r.bidders != null && r.networkSize != null ? "Soumissionnaires / SVT du réseau" : r.bidders != null ? "Soumissionnaires" : "SVT du réseau", [r.bidders, r.networkSize].filter((v): v is number => v != null).map(fmt).join(" / ")]);
  } else if (sl) {
    const o = (e as { o: Offer }).o;
    if (rendementLigne != null) faits.push(["Rendement actuariel", fmtPct(rendementLigne, 2)]);
    if (o.servedPricePct != null) faits.push(["Prix servi", fmtPct(o.servedPricePct, 2)]);
    faits.push(["Ticket min.", sl.minimum]);
  }
  const code = r ? r.codeEmission : offre?.isin;
  return (
    <Depliable ouvert={ouvert} replier={replier}>
      {/* TOUTE LA CARTE S'OUVRE ET SE REFERME (9 novembre 2026) : un toucher n'importe où déplie ; le chevron reste le bouton qu'atteignent le clavier et le lecteur d'écran. */}
      <article
        className={`${styles.card} ${styles.compact}`}
        data-seance-close
        onClick={(ev) => {
          if (!(ev.target as HTMLElement).closest("button, a")) basculer();
        }}
        style={{ cursor: "pointer" }}
      >
        <div className={styles.cLink}>
          <span className={`${styles.cId}`}>
            <b className={`${styles.cCode} ${styles.cCodeLong}`}>
              <Drapeau pays={pays} largeur={19} /> {nom}
            </b>
            <small className={`${styles.cSub} ${styles.cSubLong}`}>{sub}</small>
          </span>
          <span className={styles.cNum}>
            <b>{chiffre}</b>
            <small>{t(legende)}</small>
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
        </div>
      </Extension>
    </Depliable>
  );
}
