import "server-only";
import { repo } from "@/lib/data";
import type { Intent, Offer } from "@/lib/domain/types";
import { ETATS_OUVERTS, souffranceDe, SOUFFRANCE_DEFAUT, type DelaiDeSouffrance, type Souffrance } from "@/lib/domain/souffrance";

/**
 * LE DOMICILE DE L'ATTENTE DES ORDRES.
 *
 * Deux pages en ont besoin : le carnet, qui la montre, et la page du délai,
 * qui montre ce que le seuil attraperait. Elles l'ont d'abord lue chacune de
 * leur côté, et un cliquet de la maison l'a vu tout de suite : une lecture
 * partagée qui se multiplie finit par diverger, et c'est toujours celle qu'on
 * regarde le moins qui reste en arrière.
 *
 * TOUT LE SOIN EST DANS LA LECTURE DU JOURNAL, et il tient en une phrase :
 * ON BORNE PAR CE QU'ON CHERCHE, JAMAIS PAR UNE PROFONDEUR. « listEvents(n) »
 * rend les n plus récents tous ordres confondus, et le client du dépôt coupe
 * à mille sans le dire : la transition d'un ordre de septembre n'y est pas, et
 * le calcul retombe alors sur la date de réception EN SE FAISANT PASSER POUR
 * UN TEMPS D'ATTENTE. Deux mesures s'y sont perdues le même jour, dont celle
 * qui cherchait le défaut.
 */

export interface AttenteDUnOrdre {
  intent: Intent;
  offre?: Offer;
  souffrance: Souffrance;
}

/**
 * Les ordres qui attendent encore quelque chose de nous, avec leur âge.
 *
 * Le délai est passé plutôt que lu ici : la page du réglage veut l'âge NU
 * pour montrer ce qu'un AUTRE seuil attraperait, et une fonction qui irait
 * chercher le seuil courant elle-même le lui interdirait.
 */
export async function attentesDesOrdres(
  delai: DelaiDeSouffrance = SOUFFRANCE_DEFAUT,
  now = new Date(),
  deja?: { intents: Intent[]; offers: Offer[] },
): Promise<Map<string, AttenteDUnOrdre>> {
  const r = repo();
  const [intents, offers] = deja ? [deja.intents, deja.offers] : await Promise.all([r.listIntents(), r.listOffers()]);
  const parLigne = new Map(offers.map((o) => [o.id, o]));
  const ouverts = intents.filter((i) => ETATS_OUVERTS.includes(i.state));

  const journal = ouverts.length ? await r.listEventsOfIntents(ouverts.map((i) => i.id)).catch(() => []) : [];

  const out = new Map<string, AttenteDUnOrdre>();
  for (const i of ouverts) {
    const offre = parLigne.get(i.offerId);
    const s = souffranceDe(i, offre, journal, delai, now);
    if (s) out.set(i.id, { intent: i, offre, souffrance: s });
  }
  return out;
}

/** Un seuil impossible à atteindre : la page du réglage veut l'âge, pas le verdict. */
export const SANS_SEUIL: DelaiDeSouffrance = { jours: 99_999, avantCloture: -1 };
