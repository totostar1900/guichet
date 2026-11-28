import { OfferBrowser } from "@/components/OfferBrowser";
import { getT } from "@/i18n/server";
import styles from "./TitresBody.module.css";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { fondsListes, lignesDeLaCote } from "@/lib/domain/listes";
import { lectureDeLaCote } from "@/lib/market/performe";


/**
 * La liste des titres, une seule fois.
 *
 * Le Guichet la montre au client, le desk la montre au desk : ce sont les
 * mêmes lignes, lues au même bulletin. C'est « DeskView », autour de ce corps,
 * qui dit où mènent les rangées et quelles commandes n'ont pas lieu d'être.
 */
export async function TitresBody() {
  /* La langue et la session ne dépendent de rien : une seule attente, puis les lectures de la page (deux étages, non trois). */
  const [t, session] = await Promise.all([getT(), getSession()]);
  /**
   * LES ALERTES DE CE LECTEUR, LUES ICI.
   *
   * RELEVÉ LE 28 OCTOBRE 2026, sur une remarque de lecteur : « la pastille est
   * là, pas la cloche ». La cloche qui dit qu'une alerte est armée existe
   * depuis le 24 octobre et marche — aux adjudications, qui lisent les veilles
   * et les passent à la liste. LA COTE NE LES LISAIT PAS : `suivis` manquait,
   * `armees` était donc un ensemble vide, et la cloche ne pouvait pas paraître
   * sur la plus longue liste de la maison, celle où vivent presque toutes les
   * lignes qu'on surveille.
   *
   * CE N'ÉTAIT PAS UN DÉFAUT D'AFFICHAGE mais un argument oublié, et c'est la
   * sorte de panne qui ne se voit pas : la carte était juste, la page la
   * nourrissait mal. Conduit sur l'application avant et après — alerte armée
   * sur la première ligne, `/moi/suivies` la voit, la cote montrait six
   * pastilles et zéro cloche.
   *
   * ON RATTRAPE PLUTÔT QUE DE FAIRE TOMBER LA PAGE : la cote est la liste
   * d'entrée, et une lecture de veilles qui échoue ne doit pas l'effacer. Le
   * prix de ce rattrapage est que la cloche se taira si la table boude — c'est
   * le même choix que « mes lignes suivies », pour la même raison.
   */
  const [all, veilles, lue] = await Promise.all([
    repo().listOffers(),
    session ? repo().listWatches(session.userId).catch(() => []) : Promise.resolve([]),
    /* LA COURBE ET LA VARIATION DE CHAQUE ACTION SUR 3 MOIS, 6 MOIS ET 1 AN, plus les fenêtres de l'extension de la carte : UNE lecture des cotations pour toute la cote, jamais ligne par ligne (28 novembre 2026). */
    lectureDeLaCote().catch((): Awaited<ReturnType<typeof lectureDeLaCote>> => ({ periodes: {}, fenetres: {} })),
  ]);
  /* LE PETIT GRAPHE DE CHAQUE ACTION (4 novembre 2026), sur la période que le lecteur choisit ; la lecture envoie les trois, le choix se fait dans le navigateur (quelques actions, quelques centaines de points). Les obligations n'y sont pas : leur mouvement dit l'état des taux, pas celui d'une société. */
  const courbes = Object.fromEntries(
    Object.entries(lue.periodes).flatMap(([isin, p]) => {
      const trois = p["3m"];
      return [[isin, { serie: trois?.serie ?? [], variationPct: trois?.variationPct ?? 0, fenetres: lue.fenetres[isin], periodes: p }]];
    }),
  );
  /* La cote et les fonds : le tri vit dans « domain/listes », avec ce qu'il
     écarte et pourquoi. Les séances ont leur page. */
  const offers = lignesDeLaCote(all);
  const fundsCount = fondsListes(all).length;
  const nowIso = new Date().toISOString();
  return (
    /* LES DEUX BANDES DU HAUT SONT PARTIES. L'indice et le silence du marché
       primaire ouvraient la page des titres sur deux encarts qu'il fallait
       dépasser avant d'atteindre la première ligne, alors qu'aucun des deux
       ne répond à la question qu'on vient poser ici : quoi acheter. L'indice
       a sa page, et le calendrier des adjudications est désormais à un
       toucher dans la bande des lieux. */
    <>
      <OfferBrowser offers={offers} nowIso={nowIso} fundsCount={fundsCount} suivis={veilles.map((w) => w.offerId)} courbes={courbes} />
      <p className={styles.note}>{t("Les variations de cours sont des performances passées, mesurées sur la période choisie (3 mois, 6 mois ou 1 an) et hors dividendes : elles ne préjugent pas des performances futures. Un cours reste inchangé quand une ligne n'est pas échangée : la carte dit depuis quand.")}</p>
      {/* Le retour en haut est monté par la liste, avec son jumeau : les
          deux paraissent au même moment. */}
    </>
  );
}
