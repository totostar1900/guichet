import Link from "next/link";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { COUVERTURE_FIABLE_DEPUIS, aServi, partCouverte, tauxLimiteParDuree, vueClient, type SeanceClient } from "@/lib/market/adjudications-client";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Les adjudications" };

/**
 * LES ADJUDICATIONS : CE QUE LE MARCHÉ A PAYÉ, TEL QUE LE COMMUNIQUÉ L'IMPRIME.
 *
 * Décidé le 6 novembre 2026 (planche « Import OJA et résultats », 5A). Le
 * calendrier des séances à venir reste à Trade : il s'achète. Cette page-ci se
 * lit : elle montre des séances closes, et seulement les grandeurs que le
 * Trésor publie. Tout passe par `vueClient`, une liste blanche : le carnet
 * d'offres, la part rejetée au prix, les comptes et la source des chiffres n'y
 * arrivent jamais, et le test `adjudications-client.test.ts` le garde.
 */
export default async function AdjudicationsClientPage() {
  const t = await getT();
  const toutes = vueClient(await repo().listAuctionResults({ limit: 20_000 }));
  const dernieres = toutes.slice(0, 12);
  const durees = tauxLimiteParDuree(toutes);
  const part = toutes.length ? partCouverte(toutes, toutes[0].sessionOn) : undefined;

  return (
    <Glissement>
      <div className="pile">
        <EnTete surTitre={`BVMAC · ${t("Le marché")}`} titre={t("Les adjudications")} phrase={t("Ce que les Trésors de la zone ont obtenu, séance après séance, tel que leur communiqué le publie.")} />

        {dernieres.length === 0 ? (
          <div className="empty">{t("Aucune séance relue pour le moment.")}</div>
        ) : (
          <section className="panel" id="seances">
            <div className="panel-h">
              <h2>{t("Les dernières séances")}</h2>
            </div>
            <ul className={styles.liste}>
              {dernieres.map((s) => (
                <li key={s.id} className={styles.seance}>
                  <Seance s={s} t={t} />
                </li>
              ))}
            </ul>
            <p className={styles.note}>{t("Les montants sont en francs CFA. Un taux ou un prix absent n'a pas été imprimé dans le communiqué.")}</p>
          </section>
        )}

        {durees.length > 0 && (
          <section className="panel" id="durees">
            <div className="panel-h">
              <h2>{t("Taux limite par durée")}</h2>
            </div>
            <div className={styles.tableau}>
              <table>
                <thead>
                  <tr>
                    <th>{t("Trésor")}</th>
                    <th>{t("Durée")}</th>
                    <th className={styles.n}>{t("Taux limite")}</th>
                    <th className={styles.n}>{t("Séance du")}</th>
                  </tr>
                </thead>
                <tbody>
                  {durees.map((d) => (
                    <tr key={`${d.country}|${d.tenor}`}>
                      <td>{d.country}</td>
                      <td>{t(d.tenor)}</td>
                      <td className={styles.n}>{fmtPct(d.rateLimit, 2)}</td>
                      <td className={styles.n}>{fmtDate(d.sessionOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>{t("Le taux de la dernière séance des bons à 13, 26 et 52 semaines qui a servi des soumissions.")}</p>
          </section>
        )}

        {part && (
          <section className="panel" id="couverture">
            <div className="panel-h">
              <h2>{t("Part des séances couvertes")}</h2>
            </div>
            <div className={styles.part}>
              <b>{fmtPct((part.couvertes / part.sur) * 100, 0)}</b>
              <span>{t("{c} séances sur {n} ont reçu au moins le montant annoncé, depuis le {d}.", { c: part.couvertes, n: part.sur, d: fmtDate(part.depuis) })}</span>
            </div>
            <p className={styles.note}>
              {t("Avant le {d}, l'état des offres n'est pas lisible : la couverture d'une séance plus ancienne est une indication, et n'entre pas dans ce chiffre.", { d: fmtDate(COUVERTURE_FIABLE_DEPUIS) })}
            </p>
          </section>
        )}

        <p className={styles.source}>
          {t("Guichet reproduit les chiffres des communiqués des Trésors, relus avant publication ; il n'en ajoute aucun.")}{" "}
          <Link href="/marche">{t("Le marché")}</Link>
        </p>
      </div>
    </Glissement>
  );
}

type T = Awaited<ReturnType<typeof getT>>;

function Case({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <dd>{n}</dd>
      <dt>{l}</dt>
    </div>
  );
}

function Seance({ s, t }: { s: SeanceClient; t: T }) {
  const bon = s.instrument === "BTA";
  const moyen = bon ? s.rateAvg : s.priceAvg;
  const [bas, haut] = bon ? [s.rateMin, s.rateMax] : [s.priceMin, s.priceMax];
  const limite = bon ? s.rateLimit : s.priceLimit;
  const unite = bon ? "taux" : "prix";
  return (
    <>
      <div className={styles.tete}>
        <div>
          <b>
            {s.country} · {s.instrument} {t(s.tenor)}
          </b>
          <span>{fmtDate(s.sessionOn)}{s.codeEmission ? ` · ${s.codeEmission}` : ""}</span>
        </div>
        {moyen != null && aServi(s) && (
          <div className={styles.moyen}>
            <b>{fmtPct(moyen, 2)}</b>
            <span>{t(unite === "taux" ? "taux moyen pondéré" : "prix moyen pondéré")}</span>
          </div>
        )}
      </div>
      <dl className={styles.grille}>
        {limite != null && <Case n={fmtPct(limite, 2)} l={t(bon ? "taux limite" : "prix limite")} />}
        {bas != null && haut != null && <Case n={`${fmtPct(bas, 2)} – ${fmtPct(haut, 2)}`} l={t(bon ? "taux min – max" : "prix min – max")} />}
        {s.announced != null && <Case n={money(s.announced)} l={t("annoncé")} />}
        {s.bid != null && <Case n={money(s.bid)} l={t("soumissions")} />}
        {s.served != null && <Case n={money(s.served)} l={t("servi")} />}
        {s.coverage != null && <Case n={fmtPct(s.coverage, 0)} l={t("couverture")} />}
        {s.bidders != null && <Case n={fmt(s.bidders)} l={t("soumissionnaires")} />}
        {s.networkSize != null && <Case n={fmt(s.networkSize)} l={t("SVT du réseau")} />}
      </dl>
    </>
  );
}
