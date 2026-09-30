import { OfferBrowser } from "@/components/OfferBrowser";
import { BackToTop } from "@/components/BackToTop";
import { repo } from "@/lib/data";
import { IndexPulse } from "@/components/IndexPulse";
import { PrimaireSilence } from "@/components/market/PrimaireSilence";

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
  const offers = all.filter((o) => !o.hidden && o.kind !== "FONDS" && !(o.kind !== "MARCHE" && (o.status === "live" || o.status === "matured") && quoted.has(o.isin)));
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
    <>
      <IndexPulse compact />
      {!primaireOuvert && <PrimaireSilence derniereSeance={derniere} />}
      <OfferBrowser offers={offers} nowIso={nowIso} fundsCount={fundsCount} />
      <BackToTop />
    </>
  );
}
