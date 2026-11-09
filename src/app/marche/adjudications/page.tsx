import Link from "next/link";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate, fmtPct } from "@/lib/format";
import { COUVERTURE_FIABLE_DEPUIS, partCouverte, tauxLimiteParDuree, vueClient } from "@/lib/market/adjudications-client";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { CarteDeSeanceClose } from "@/components/market/CarteDeSeanceClose";
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
          <section className={styles.seances} id="seances" aria-labelledby="dernieres-seances">
            {/* UNE TUILE PAR SÉANCE, PLEINE LARGEUR (9 novembre 2026, 3A) : le même composant que les séances closes d'Investir, au lieu de rangées dans un panneau qui les rétrécissait et collait la première au bandeau. */}
            <h2 id="dernieres-seances" className={styles.titreListe}>
              {t("Les dernières séances")}
            </h2>
            {dernieres.map((s) => (
              <CarteDeSeanceClose key={s.id} s={s} />
            ))}
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
