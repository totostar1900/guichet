import "server-only";
import { repo } from "@/lib/data";
import { localIso } from "@/lib/format";
import { quantitatif, type Granularite, type Quantitatif } from "@/lib/domain/quantitatif";
import type { Period } from "@/lib/reporting";

/**
 * LES LECTURES DE LA VUE QUANTITATIVE, EN UN SEUL ENDROIT.
 *
 * Les dates de passage d'un ordre (servie, réglée) ne vivent pas sur l'ordre :
 * elles se retrouvent dans le journal des événements. Quatre pages du desk
 * lisaient déjà ce journal, et une cinquième aurait fait du « listEvents »
 * une lecture éparpillée que personne ne saurait plus suivre. Le cliquet du
 * domicile l'a dit au moment même où j'allais l'ajouter.
 *
 * La page demande donc ce qu'elle affiche, pas ce qu'il faut lire pour le
 * calculer. Et le jour où un ordre portera ses propres dates de passage, il y
 * aura une seule fonction à changer.
 */
export interface SourceQuantitative {
  /** Le premier geste connu du client : dossier créé, ordre déposé, argent arrivé. */
  ouverture: string;
  aujourdHui: string;
}

export async function ouvertureDuCompte(userId: string, dossierCreeLe: string): Promise<SourceQuantitative> {
  const r = repo();
  const [intents, cash] = await Promise.all([r.listIntents(), r.listCash(userId).catch(() => [])]);
  const jours = [dossierCreeLe, ...intents.filter((i) => i.clientId === userId).map((i) => i.createdAt), ...cash.map((c) => c.at)].map((d) => d.slice(0, 10)).sort();
  return { ouverture: jours[0] ?? localIso(new Date()), aujourdHui: localIso(new Date()) };
}

export async function chargerQuantitatif(userId: string, plage: Period, granularite: Granularite): Promise<Quantitatif> {
  const r = repo();
  const [intents, offers, events, cash] = await Promise.all([r.listIntents(), r.listOffers(), r.listEvents(5000), r.listCash(userId).catch(() => [])]);
  return quantitatif(userId, intents, offers, events, cash, plage, granularite);
}
