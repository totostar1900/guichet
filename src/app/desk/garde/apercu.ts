import "server-only";
import { repo } from "@/lib/data";
import { droitsDeGarde, positionGardee, type BaremeGarde, type Periode } from "@/lib/domain/garde";
import { positionsFrom } from "@/lib/positions";

/**
 * Ce que chaque client devrait pour une période, sans rien prélever.
 *
 * La prévisualisation n'écrit rien, et c'est sa raison d'être : un barème se
 * juge sur ce qu'il produit, pas sur ses chiffres. Le desk le voit avant de
 * l'arrêter, et un barème fermé se prévisualise comme un autre.
 *
 * Elle vit HORS du fichier d'actions, et c'est délibéré. Toute fonction
 * exportée d'un module « use server » est une porte ouverte sur le réseau :
 * celle-ci lit les positions de tous les clients de la maison, et l'appelant
 * choisit le barème. Rangée là, elle ne s'atteint que depuis le serveur, qui a
 * déjà vérifié qui regarde.
 */
export async function apercuGarde(periode: Periode, bareme: BaremeGarde) {
  const r = repo();
  const [intents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
  const clients = [...new Set(intents.filter((i) => i.clientId).map((i) => i.clientId!))];
  const dejaEmis = await r.listCustodyNotices({ period: periode.cle }).catch(() => []);
  const emisPour = new Set(dejaEmis.map((a) => a.userId));

  return clients
    .map((clientId) => {
      const siens = intents.filter((x) => x.clientId === clientId);
      const lignes = positionsFrom(siens, offers).map(positionGardee);
      return {
        clientId,
        nom: siens[0]?.clientName ?? clientId,
        droits: droitsDeGarde(lignes, bareme, periode),
        dejaEmis: emisPour.has(clientId),
      };
    })
    .filter((c) => c.droits.lignes.length > 0)
    .sort((a, b) => b.droits.du - a.droits.du || b.droits.assietteMoyenne - a.droits.assietteMoyenne);
}
