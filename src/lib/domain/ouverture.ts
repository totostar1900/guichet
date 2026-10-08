import type { ClientFile } from "./kyc";
import type { IntentType } from "./types";

/**
 * CE QU'IL FAUT AVOIR OUVERT POUR QU'UN ORDRE PARTE, ET CE QU'ON N'ATTEND PAS
 * POUR LE PRENDRE.
 *
 * Deux chaînes de conservation, deux exigences. Une part d'OPCVM s'inscrit au
 * registre des porteurs du fonds : le dossier approuvé et la convention
 * suffisent. Un titre s'inscrit dans un compte-titres nominatif chez le teneur
 * de compte : il y faut en plus le sous-compte.
 *
 * LA RÈGLE ARRÊTÉE LE 9 OCTOBRE 2026 : pour un résident dont le dossier est
 * approuvé, on ne fait plus attendre l'ordre. Il est accepté, l'ouverture part
 * aussitôt, et c'est la TRANSMISSION au marché qui attend le sous-compte, pas
 * le client. Depuis l'étranger, l'ordre attend l'appel vidéo et l'ouverture :
 * la différence n'est pas une préférence, c'est le niveau de diligence que
 * demande un dossier non résident.
 *
 * L'ÉTAT NE SE RANGE PAS EN BASE, il se lit. Il dépend du dossier, qui bouge
 * de son côté : un drapeau posé à la création dirait encore « en attente » le
 * lendemain de l'ouverture. Il se calcule donc à chaque lecture, des deux
 * côtés, à partir de la même fonction. C'est aussi la fin d'un marqueur écrit
 * DANS le message du client (« [compte-titres à ouvrir] … ») : un état
 * machine logé dans un texte libre finit par se comparer de travers.
 */

/** Les types d'ordre qui s'inscrivent en compte-titres, donc qui demandent le sous-compte. */
export const surDesTitres = (t: IntentType): boolean => t === "ferme" || t === "cession" || t === "achat" || t === "vente";

/** Les types d'ordre qui s'inscrivent au registre d'un fonds : le dossier suffit. */
export const surDesParts = (t: IntentType): boolean => t === "souscription" || t === "rachat";

/** Le dossier est-il approuvé et la convention acceptée ? La base de tout. */
export const dossierPret = (f: ClientFile | undefined): boolean => Boolean(f && f.status === "approuve" && f.consents.conventionAt);

/** Le sous-compte est-il ouvert chez le teneur de compte ? */
export const sousCompteOuvert = (f: ClientFile | undefined): boolean => Boolean(f?.review.custodianAccount);

/**
 * L'ordre attend-il une ouverture avant de pouvoir partir au marché ?
 *
 * Vrai pour un ordre sur titre dont le sous-compte n'est pas encore ouvert.
 * L'ordre existe, il est valable, le client n'a rien de plus à faire : c'est
 * la maison qui doit ouvrir.
 */
export const enAttenteDOuverture = (type: IntentType, f: ClientFile | undefined): boolean => surDesTitres(type) && !sousCompteOuvert(f);

/**
 * Peut-on prendre cet ordre aujourd'hui, sans attendre l'ouverture ?
 *
 * Le dossier approuvé et la convention sont requis dans tous les cas : aucune
 * diligence ne se saute. Le sous-compte, lui, ne retient que le non-résident.
 */
export const ordreAcceptable = (type: IntentType, f: ClientFile | undefined): boolean => {
  if (!dossierPret(f)) return false;
  if (!surDesTitres(type)) return true;
  if (sousCompteOuvert(f)) return true;
  return !f?.identity.residentAbroad;
};

/** Ce qui manque, en une phrase, pour le dire au desk comme au client. */
export function cequiManque(type: IntentType, f: ClientFile | undefined): string | undefined {
  if (!dossierPret(f)) return "dossier à approuver et convention à accepter";
  if (enAttenteDOuverture(type, f)) return f?.identity.residentAbroad ? "appel vidéo et sous-compte titres à ouvrir" : "sous-compte titres à ouvrir";
  return undefined;
}
