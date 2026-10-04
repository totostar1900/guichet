import { OfferBrowser } from "@/components/OfferBrowser";
import { BackToTop } from "@/components/BackToTop";
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
  const [all, lues] = await Promise.all([repo().listOffers(), repo().listAuctionResults({ limit: 2000 }).catch(() => [])]);
  /* La cote et les fonds : le tri vit dans « domain/listes », avec ce qu'il
     écarte et pourquoi. Les séances ont leur page. */
  const offers = lignesDeLaCote(all);
  const fundsCount = fondsListes(all).length;
  const nowIso = new Date().toISOString();
  /**
   * Y a-t-il une séance primaire ouverte ?
   *
   * Un bon ou une obligation du Trésor dont la clôture est devant nous. Quand
   * il n'y en a aucune, la page le dit : sans cette bande, elle affichait la
   * cote et les fonds, et le lecteur qui venait chercher une adjudication
   * concluait qu'on la lui cachait.
   */
  const primaireOuvert = offers.some((o) => (o.kind === "BTA" || o.kind === "OTA") && o.status !== "withdrawn" && o.deadlineAt > nowIso);
  const derniere = lues
    .filter((x) => !x.setAsideAt && x.confirmedBy)
    .map((x) => x.sessionOn)
    .sort()
    .pop();
  return (
    /* LES DEUX BANDES DU HAUT SONT PARTIES. L'indice et le silence du marché
       primaire ouvraient la page des titres sur deux encarts qu'il fallait
       dépasser avant d'atteindre la première ligne, alors qu'aucun des deux
       ne répond à la question qu'on vient poser ici : quoi acheter. L'indice
       a sa page, et le calendrier des adjudications est désormais à un
       toucher dans la bande des lieux. */
    <>
      <OfferBrowser offers={offers} nowIso={nowIso} fundsCount={fundsCount} />
      {/* Le retour en haut est monté par la liste, avec son jumeau : les
          deux paraissent au même moment. */}
    </>
  );
}
