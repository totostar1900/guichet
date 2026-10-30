import Link from "next/link";
import { getT } from "@/i18n/server";
import { repo } from "@/lib/data";
import { echeancesProches, joursEnMots, type Urgence } from "@/lib/domain/echeances";
import type { Offer } from "@/lib/domain/types";
import styles from "./CeQuiFermeBientot.module.css";

/**
 * CE QUI FERME BIENTÔT : les séances dont la clôture approche.
 *
 * POURQUOI ELLE EXISTE. Une adjudication s'annonce une semaine avant de se
 * fermer, et l'annonce dort dans un communiqué que personne ne va chercher :
 * c'est le défaut que le calendrier a été écrit pour corriger. Mais le
 * calendrier est une page où l'on va ; celle-ci est une bande qu'on croise.
 * Un épargnant qui n'ouvre pas le calendrier cette semaine-là apprend la
 * séance une fois passée, ce qui revient à ne jamais y prendre part.
 *
 * LE TEMPS QUI RESTE, ET NON LA DATE. « Clôture le 29 octobre » oblige le
 * lecteur à faire la soustraction, et il la fait mal : la page sait quel jour
 * on est, lui doit s'en souvenir. C'est déjà la règle des rappels par
 * message (`watch.rappelMessage`), et les trois surfaces emploient les mêmes
 * mots — « aujourd'hui », « demain », « dans {n} jours » — pour que le client
 * ne lise pas deux vocabulaires du même fait. Ces mots viennent désormais de
 * `joursEnMots` : cette bande en gardait sa propre copie, sous un commentaire
 * qui déclarait justement qu'elle en était une.
 *
 * TROIS TONS, QUI SONT DES PALIERS DE DÉCISION. Sous sept jours, un virement
 * interbancaire de la zone n'est plus certain d'arriver avant le dépôt : le
 * ton le dit. Les seuils vivent dans le domaine, pas ici — une feuille de
 * style ne décide pas de ce qui presse.
 *
 * VIDE, ELLE N'EST PAS LÀ. Même règle que « Ce qui vous attend » : une bande
 * qui dit « aucune séance » occupe la place de ce qui compte et apprend à
 * l'œil à sauter cet endroit, y compris le jour où elle dit quelque chose.
 * C'est l'état le plus fréquent — les Trésors publient par vagues — et c'est
 * précisément pourquoi elle doit disparaître proprement.
 *
 * ELLE SE BORNE À TROIS, puis nomme le reste et mène au calendrier, dont
 * c'est le travail de les porter toutes.
 */
export async function CeQuiFermeBientot({ offres, max = 3 }: { /** Les offres déjà en main, pour ne pas les relire. */ offres?: Offer[]; max?: number }) {
  const t = await getT();
  /* LES OFFRES SE PASSENT QUAND ON LES A DÉJÀ. La page d'arrivée les lit pour
     ses positions ; les relire ici serait deux lectures du même objet dans la
     même requête, donc deux occasions de diverger — le défaut que la page
     Trade s'est fait retirer en octobre. Là où personne ne les tient, la
     bande les demande elle-même plutôt que d'obliger chaque page à savoir de
     quoi elle a besoin. */
  const offers = offres ?? (await repo().listOffers().catch(() => []));
  const toutes = echeancesProches(offers);
  if (!toutes.length) return null;
  const montrees = toutes.slice(0, max);
  const reste = toutes.length - montrees.length;

  return (
    <section className={styles.bloc} aria-labelledby="ferme-bientot">
      <div className={styles.tete}>
        <h2 id="ferme-bientot" className={styles.titre}>
          {t("Ce qui ferme bientôt")}
        </h2>
        <Link className={styles.tout} href="/calendrier">
          {t("Le calendrier")} →
        </Link>
      </div>
      <ul className={styles.liste}>
        {montrees.map((e) => {
          const quand = joursEnMots(e.jours);
          return (
          <li key={e.offerId}>
            <Link className={styles.ligne} href={e.href}>
              <span className={styles.quoi}>
                <b>{t(e.titre)}</b>
                <small>{t(e.quoi.key, e.quoi.params)}</small>
              </span>
              {/* L'URGENCE EST ÉCRITE, pas seulement teintée : « dans 3 jours »
                  se lit en noir et blanc, et un lecteur qui ne distingue pas
                  le rouge du doré garde l'information entière.
                  LES MOTS VIENNENT DU DOMAINE, et l'unité s'y dit en entier :
                  une pastille a la place de « dans 12 jours », et « 12 j » est
                  un télégramme là où rien ne presse de l'être. */}
              <span className={`${styles.reste} ${TON[e.urgence]}`}>{t(quand.key, quand.params)}</span>
            </Link>
          </li>
          );
        })}
      </ul>
      {reste > 0 && (
        <Link className={styles.autres} href="/calendrier">
          {t(reste > 1 ? "et {n} autres séances" : "et une autre séance", { n: String(reste) })}
        </Link>
      )}
    </section>
  );
}

const TON: Record<Urgence, string> = { urgent: styles.urgent, bientot: styles.bientot, calme: styles.calme };
