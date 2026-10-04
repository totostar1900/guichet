import { OfferBrowser } from "@/components/OfferBrowser";
import { BackToTop } from "@/components/BackToTop";
import { repo } from "@/lib/data";
import { lieuDe } from "@/lib/domain/sections";


/**
 * La liste des titres, une seule fois.
 *
 * Le Guichet la montre au client, le desk la montre au desk : ce sont les
 * mêmes lignes, lues au même bulletin. C'est « DeskView », autour de ce corps,
 * qui dit où mènent les rangées et quelles commandes n'ont pas lieu d'être.
 */
export async function TitresBody() {
  const [all, lues] = await Promise.all([repo().listOffers(), repo().listAuctionResults({ limit: 2000 }).catch(() => [])]);
  // Funds live on their own page (every OPCVM with a published NAV, distributed or not).
  // A primary line (OTA, APE) that is settled or matured and quoted at the BVMAC since : its bulletin line stands for it, once.
  const quoted = new Set(all.filter((o) => o.kind === "MARCHE" && !o.hidden && o.isin).map((o) => o.isin));
  /**
   * LA COTE, ET RIEN QUE LA COTE.
   *
   * Les séances de la BEAC sont parties aux Adjudications, où elles ont un
   * cycle. Elles restaient ici faute d'en sortir un jour : la règle ne retirait
   * une ligne du primaire qu'à sa cotation, et un bon du Trésor n'est jamais
   * coté. Mesuré le 4 octobre 2026 : neuf séances closes depuis deux à trois
   * semaines dormaient dans cette liste à l'état « publié », sans résultat.
   */
  const offers = all.filter((o) => !o.hidden && lieuDe(o) === "cote" && !((o.status === "live" || o.status === "matured") && o.kind !== "MARCHE" && quoted.has(o.isin)));
  const seances = all.filter((o) => !o.hidden && lieuDe(o) === "adjudications");
  void seances;
  const fundsCount = all.filter((o) => o.kind === "FONDS").length;
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
