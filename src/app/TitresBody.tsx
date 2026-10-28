import { OfferBrowser } from "@/components/OfferBrowser";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { fondsListes, lignesDeLaCote } from "@/lib/domain/listes";


/**
 * La liste des titres, une seule fois.
 *
 * Le Guichet la montre au client, le desk la montre au desk : ce sont les
 * mêmes lignes, lues au même bulletin. C'est « DeskView », autour de ce corps,
 * qui dit où mènent les rangées et quelles commandes n'ont pas lieu d'être.
 */
export async function TitresBody() {
  const session = await getSession();
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
  const [all, veilles] = await Promise.all([
    repo().listOffers(),
    session ? repo().listWatches(session.userId).catch(() => []) : Promise.resolve([]),
  ]);
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
      <OfferBrowser offers={offers} nowIso={nowIso} fundsCount={fundsCount} suivis={veilles.map((w) => w.offerId)} />
      {/* Le retour en haut est monté par la liste, avec son jumeau : les
          deux paraissent au même moment. */}
    </>
  );
}
