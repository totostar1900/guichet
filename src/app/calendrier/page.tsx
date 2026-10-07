import { repo } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { OngletsMarche } from "@/components/market/OngletsMarche";
import { OfferBrowser } from "@/components/OfferBrowser";
import { AdjudicationsEnBref } from "./EnBref";
import { seancesAnnoncees } from "@/lib/domain/listes";

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
  const t = await getT();
  const session = await getSession();
  /* LES ALERTES DE CE LECTEUR, lues ici : la carte ne peut pas les demander
     elle-même sans un aller-retour par ligne, et sans elles la cloche ne
     saurait pas quoi montrer. Sans session, personne n'a d'alerte. */
  const [offers, veilles] = await Promise.all([repo().listOffers(), session ? repo().listWatches(session.userId) : Promise.resolve([])]);
  const seances = seancesAnnoncees(offers);
  const suivis = veilles.map((w) => w.offerId);

  return (
    <div className={styles.page}>
      <OngletsMarche />
      <div className={styles.head}>
        <h1 className="display">{t("Adjudications")}</h1>
        <AdjudicationsEnBref />
      </div>
      {seances.length > 0 ? (
        <OfferBrowser offers={seances} nowIso={new Date().toISOString()} fundsCount={0} lieu="adjudications" suivis={suivis} />
      ) : (
        <p className="muted">{t("Aucune séance ouverte à Guichet pour l'instant. Les Trésors publient leurs communiqués par vagues, souvent une semaine avant la séance.")}</p>
      )}

      <p className={styles.note}>
        {t("Chaque ligne cite le communiqué du Trésor concerné, publié par la BEAC : c'est la source, et elle fait foi. Le montant, le taux et le nominal sont dans le communiqué. Pour prendre part à une séance, dites-le au desk avant la clôture, qui précède la séance.")}
      </p>
    </div>
  );
}
