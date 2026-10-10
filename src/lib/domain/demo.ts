import type { ClientFile } from "@/lib/domain/kyc";
import type { Intent } from "@/lib/domain/types";

/**
 * LE COMPTE DE DÉMONSTRATION : UN FAIT SUR LE COMPTE, ET DEUX USAGES.
 *
 * Trois comptes d'essai de la maison vivent en production, et la décision du
 * 10 octobre 2026 est de les garder pour montrer le service. Le drapeau vit
 * sur le compte (`profiles.demo`), parce que tout ce qui en découle (dossier,
 * ordres, positions) est de la démonstration par son propriétaire, et jamais
 * l'inverse.
 *
 * DEUX USAGES, ET IL FAUT LES DISTINGUER, sinon la décision se retourne
 * contre elle-même :
 *
 *   - CE QUI COMPTE OU SE RAPPORTE les écarte. Le registre des clients, le
 *     journal des ordres, le rapport d'activité, les points de Santé : un
 *     compte d'essai y passerait pour un client, et deux de ces pièces se
 *     montrent au régulateur.
 *
 *   - CE QUI SE TRAVAILLE les garde. Le carnet du desk est une file de
 *     gestes, pas un chiffre : retirer un ordre de démonstration de la file
 *     rendrait impossible de montrer le desk en train de le traiter, c'est-à-
 *     dire la seule raison d'avoir gardé ces comptes. Là, l'ordre reste et
 *     porte sa marque.
 *
 * Dans les deux cas l'écart ou la marque SE DIT à l'écran : un retrait
 * silencieux et un oubli ont la même apparence.
 */
export interface CompteMarque {
  id: string;
  demo?: boolean;
}

/** Les identifiants des comptes de démonstration, pour une lecture rapide. */
export const comptesDemo = (contacts: CompteMarque[]): Set<string> => new Set(contacts.filter((c) => c.demo).map((c) => c.id));

/**
 * Un ordre sans client identifié n'est d'aucune démonstration : il a été pris
 * au guichet par un visiteur, et l'écarter par défaut retirerait du journal
 * réglementaire des ordres bien réels.
 */
export const ordreDeDemo = (demo: Set<string>, clientId?: string): boolean => Boolean(clientId && demo.has(clientId));

/**
 * Ce que les pièces qui comptent laissent dehors, calculé en un seul endroit
 * et traversé par la page du reporting, le CSV, le rapport d'activité et les
 * points de Santé.
 */
export function sansLaDemo(
  contacts: CompteMarque[],
  files: ClientFile[],
  intents: Intent[],
): { files: ClientFile[]; intents: Intent[]; dossiers: number; ordres: number; comptes: number } {
  const demo = comptesDemo(contacts);
  if (demo.size === 0) return { files, intents, dossiers: 0, ordres: 0, comptes: 0 };
  const gardes = files.filter((f) => !demo.has(f.userId));
  const ordres = intents.filter((i) => !ordreDeDemo(demo, i.clientId));
  return { files: gardes, intents: ordres, dossiers: files.length - gardes.length, ordres: intents.length - ordres.length, comptes: demo.size };
}
