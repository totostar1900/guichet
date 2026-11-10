import Link from "next/link";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { vueClient } from "@/lib/market/adjudications-client";
import { Info } from "@/components/Info";
import { TERMES_DES_RESULTATS } from "@/components/market/termes-des-resultats";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import type { EntreeClose } from "@/components/market/CarteDeSeanceClose";
import { ListeDesSeancesCloses } from "@/components/market/ListeDesSeancesCloses";
import { seancesAnnoncees } from "@/lib/domain/listes";
import { displayStatus, isPast } from "@/lib/domain/status";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Les résultats d'adjudications" };

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
  /* UNE SEULE LISTE (9 novembre 2026, soir) : les résultats confirmés, chacun enrichi de la ligne du catalogue qui porte son code d'émission (coupon, échéance, fiche), et les lignes closes du catalogue qu'aucun résultat ne porte. */
  const offres = seancesAnnoncees(await repo().listOffers());
  const parCode = new Map(offres.filter((o) => o.isin).map((o) => [o.isin as string, o]));
  const maintenant = new Date();
  const entrees: EntreeClose[] = [
    ...toutes.map((s): EntreeClose => {
      const offre = s.codeEmission ? parCode.get(s.codeEmission) : undefined;
      return { type: "resultat", s, offre };
    }),
    /* UNE LIGNE SANS RÉSULTAT N'EST PAS AFFICHÉE (9 novembre 2026, planche « Résultats des séances », 1 et 3) : cette page dit ce qui a été servi. Une ligne du catalogue n'y entre que si sa fiche porte un prix servi (2B). */
    ...offres.filter((o) => isPast(displayStatus(o, maintenant)) && o.servedPricePct != null && !(o.isin && toutes.some((s) => s.codeEmission === o.isin))).map((o): EntreeClose => ({ type: "ligne", o })),
  ];

  return (
    <Glissement>
      <div className="pile">
        <EnTete
          surTitre={`BVMAC · ${t("Le marché")}`}
          titre={t("Les résultats d'adjudications")}
          aCote={<Info termes={TERMES_DES_RESULTATS} label="Lire les résultats" titre />}
          phrase={t("Ce que les Trésors de la zone ont obtenu, séance après séance, tel que leur communiqué le publie.")}
        />

        {entrees.length === 0 ? (
          <div className="empty">{t("Aucune séance relue pour le moment.")}</div>
        ) : (
          <section className={styles.seances} id="seances">
            {/* UNE LISTE, UNE CARTE (9 novembre 2026, soir) : résultats confirmés et lignes closes du catalogue se cherchent, se filtrent et se rangent ensemble. Le titre « Les dernières séances » est retiré (10 novembre 2026) : le titre de la page suffit. */}
            <ListeDesSeancesCloses entrees={entrees} />
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
