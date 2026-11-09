import { repo } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { Vu } from "@/components/Vu";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { OngletsMarche } from "@/components/market/OngletsMarche";
import { OfferBrowser } from "@/components/OfferBrowser";
import { EnBrefInstruments } from "@/components/EnBrefInstruments";
import { seancesAnnoncees } from "@/lib/domain/listes";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import Link from "next/link";
import { BlocPlat } from "@/components/accueil/BlocPlat";
import { GrilleDuMois } from "@/components/market/GrilleDuMois";
import { nomDeSeance } from "@/lib/domain/nom-de-ligne";
import { localIso } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return {
    title: t("Calendrier des adjudications"),
    description: t("Les séances d'émission des Trésors de la CEMAC, telles que la BEAC les annonce."),
  };
}

/**
 * Le calendrier des adjudications de la zone.
 *
 * Une adjudication s'annonce une semaine avant de se fermer, et l'annonce dort
 * dans un communiqué que personne ne va chercher. Un épargnant qui voudrait y
 * prendre part apprend l'opération une fois qu'elle est passée, ce qui revient à
 * ne jamais y prendre part.
 *
 * LA PAGE TENAIT TROIS LISTES, ELLE N'EN TIENT PLUS QU'UNE.
 *
 * Il y avait « À venir », les annonces de la BEAC encore ouvertes ; « Les
 * lignes de ces séances », ce que le desk en a ouvert au Guichet ; et
 * « Dernières séances annoncées », les communiqués passés. Trois listes du
 * même objet, à trois états, dont deux qu'on ne peut que lire. Le lecteur qui
 * veut prendre part à une séance n'a affaire qu'à la deuxième : les autres
 * l'obligeaient à comprendre, avant de chercher, laquelle des trois le
 * concerne.
 *
 * CE QUI PART AVEC ELLES, ET OÙ CELA SE RETROUVE. Les communiqués de la BEAC
 * étaient cités ligne à ligne : la porte reste ouverte dans « En bref », qui
 * mène à la page des annonces. Les séances passées relues par le desk, avec
 * leur taux moyen servi, ne sont plus ici : elles vivent au desk, dans les
 * adjudications, et sur la courbe des rendements qu'elles alimentent. Le jour
 * où un client les demandera, ce sera une page d'historique, pas une liste de
 * plus sous celle-ci.
 */
export default async function CalendrierPage() {
  /* Langue, session et offres partent ensemble ; les alertes n'attendent que la session. */
  /* LES ALERTES DE CE LECTEUR, lues ici : la carte ne peut pas les demander
     elle-même sans un aller-retour par ligne, et sans elles la cloche ne
     saurait pas quoi montrer. Sans session, personne n'a d'alerte. */
  const quand = getSession();
  const [t, offers, veilles, session] = await Promise.all([getT(), repo().listOffers(), quand.then((session) => (session ? repo().listWatches(session.userId) : [])), quand]);
  const seances = seancesAnnoncees(offers);
  const suivis = veilles.map((w) => w.offerId);

  return (
    <Glissement>
      <div className={styles.page}>
        {/* Qui suit les séances sans jamais y déposer : c'est le signal que la
            tenue regardera, et il n'existe que si on le note. */}
        {session && <Vu geste="vu.seance" objet="adjudications" />}
        <OngletsMarche />
        <EnTete surTitre={t("Investissez")} titre={t("Adjudications")} titreMasque aCote={<EnBrefInstruments page="adjudications" />} />
        {seances.length > 0 ? (
          <>
            <OfferBrowser offers={seances} nowIso={new Date().toISOString()} fundsCount={0} lieu="adjudications" suivis={suivis} />
            {/* LE CALENDRIER ET LES TROIS BOUTONS, SOUS LA LISTE (9 novembre 2026, 2B) : un mois, un point par jour de clôture ; puis ce qu'on vient faire après avoir lu les séances : en proposer une, retrouver ses alertes, voir toutes les échéances. */}
            <BlocPlat id="calendrier-des-seances" titre="Calendrier des séances" href="/echeances" tout="Toutes les échéances">
              <GrilleDuMois
                aujourdhui={localIso(new Date())}
                seances={seances.map((o) => ({ id: o.id, titre: nomDeSeance(o.title), jour: o.deadlineAt.slice(0, 10), clotureLe: o.deadlineAt, href: `/offres/${o.id}` }))}
              />
              <div className={styles.boutonsCalendrier}>
                <Link className="btn primary" href="/sondage">
                  {t("Proposer une adjudication")}
                </Link>
                <Link className="btn" href="/moi/suivies">
                  {t("Mes alertes")}
                </Link>
              </div>
            </BlocPlat>
          </>
        ) : (
          <p className="muted">{t("Aucune séance ouverte à Guichet pour l'instant. Les Trésors publient leurs communiqués par vagues, souvent une semaine avant la séance.")}</p>
        )}
      </div>
    </Glissement>
  );
}
