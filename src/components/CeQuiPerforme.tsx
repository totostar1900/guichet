import { getT } from "@/i18n/server";
import { repo } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { performanceSur, type Classement } from "@/lib/market/performe";
import { SensDuClassement } from "./SensDuClassement";
import { TitreDeBloc } from "./TitreDeBloc";
import styles from "./CeQuiPerforme.module.css";

/**
 * CE QUI PERFORME : les actions de la cote qui ont bougé, sur une fenêtre.
 *
 * POURQUOI UNE FENÊTRE, ET POURQUOI ELLE EST ÉCRITE. Relevé dans la maison :
 * l'indice bouge sur 70 des 271 séances lues, et une action garde son cours
 * dans 95 % d'entre elles. Un classement du JOUR serait donc une colonne de
 * zéros trois jours sur quatre, et « les plus fortes baisses » resterait
 * vide. La fenêtre rend le classement lisible — à condition de dire laquelle,
 * sans quoi le lecteur croit lire la séance.
 *
 * LES DEUX DATES SONT DES SÉANCES RÉELLES, et non « il y a trente jours ».
 * La lecture s'ancre sur la dernière séance publiée : si la place s'est tue
 * une semaine, la fenêtre reste celle qu'elle annonce.
 *
 * ELLE COÛTE TROIS REQUÊTES, et c'est tout l'objet de « market/performe ».
 * La même question posée à « indexPageData » en coûte une dizaine, dont sept
 * non bornées : juste sur la page du marché, hors de prix sur la page
 * d'arrivée.
 *
 * ELLE S'EFFACE QUAND RIEN N'A BOUGÉ, et ce jour-là arrive : aucune ligne
 * au-dessus du seuil d'affichage, ou pas assez d'histoire pour couvrir la
 * fenêtre. Une section qui annonce une performance et montre des zéros vaut
 * moins que pas de section.
 *
 * C'EST LE BLOC « TITRES » DE L'ACCUEIL, À SA PLACE D'ORIGINE (22 novembre 2026, le client : « remplacer le bloc Titres par celui de Ce qui performe, en conservant le titre Titres et le lien Tout voir, sans changer de position ; Ce qui performe n'est plus ailleurs »). Le titre est « Titres », le lien « Tout voir » mène à la liste des titres ; la fenêtre et le classement sont inchangés. `GrilleInvestir` le pose en première place de « Investir » et lui passe le classement qu'il a déjà lu (`classement`, `null` quand la place s'est tue) : une seule lecture pour toute la page.
 */
export async function CeQuiPerforme({ max = 3, classement: lu }: { max?: number; /** le classement déjà lu par l'accueil ; `null` : il n'y en a pas ; absent : on le lit */ classement?: Classement | null }) {
  const t = await getT();
  const classement = lu === undefined ? await performanceSur() : lu;
  if (!classement) return null;
  /* CHAQUE LIGNE OUVRE SA LIGNE (2 novembre 2026) : la fiche de la ligne quand le catalogue la porte, sinon la page de la société. Jamais un lien vers rien. */
  const ouvertes = new Set((await repo().listOffers().catch(() => [])).filter((o) => !o.hidden).map((o) => o.id));

  return (
    <section className={styles.bloc} data-anim="bloc" aria-labelledby="ce-qui-performe">
      <TitreDeBloc id="ce-qui-performe" titre="Titres" href="/titres" tout="Tout voir" />
      <div className={styles.corps}>
      {/* LA FENÊTRE EST DANS LA PHRASE, PAS DANS UNE NOTE DE BAS DE BLOC : un
          pourcentage sans sa période se lit comme celui du jour, et c'est
          justement le chiffre qui n'existe pas ici. */}
      <p className={styles.fenetre}>{t("Du {a} au {b}, sur trois mois.", { a: fmtDate(classement.depuis, false), b: fmtDate(classement.jusquAu, false) })}</p>
      <SensDuClassement lignes={classement.lignes.map((l) => ({ ...l, href: ouvertes.has(`boc-${l.isin.toLowerCase()}`) ? `/offres/boc-${l.isin.toLowerCase()}` : `/societes/${encodeURIComponent(l.mnemo)}` }))} max={max} />
      </div>
    </section>
  );
}
