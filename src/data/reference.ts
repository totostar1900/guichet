import brut from "./reference.json";
import type { Offer } from "@/lib/domain/types";
import type { AuctionResult } from "@/lib/market/auction-results";

/**
 * Les données de marché de la production, versées dans le jeu de départ.
 *
 * Elles ne servent qu'au dépôt mémoire : le développement local, et
 * l'environnement d'essai, qui tourne sans Supabase et ne peut donc pas
 * atteindre la production. Le jeu de démonstration porte huit lignes, assez
 * pour juger une mise en page et beaucoup trop maigre pour juger une liste à
 * trois vues, un tri sur huit clefs et un groupement par émetteur. On juge mal
 * une densité qu'on n'a pas.
 *
 * Le fichier est produit par `node scripts/semis-reference.mjs --ecrire`, qui
 * ne lit que deux tables, `offers` et `auction_results`, et efface au passage
 * ce qui reste d'une personne. Aucun client, aucune intention, aucun dossier.
 *
 * POURQUOI UNE DOUBLE CONVERSION, et ce qui la remplace.
 *
 * Un JSON importé arrive avec des types élargis : `kind` y est `string` quand
 * l'application veut `"OTA" | "BTA" | …`. Le compilateur ne peut donc pas
 * vérifier la forme, et prétendre le contraire avec un `as` seul serait un
 * mensonge poli. La vérification se fait ici, au chargement : ce qui n'a pas
 * ses champs indispensables est écarté et compté, plutôt que de rendre une
 * page vide sans que personne sache pourquoi.
 */

type Brut = Record<string, unknown>;

const offresBrutes = (brut as { offres?: Brut[] }).offres ?? [];
const seancesBrutes = (brut as { seances?: Brut[] }).seances ?? [];

const aTout = (o: Brut, clefs: string[]): boolean => clefs.every((c) => o[c] !== undefined && o[c] !== null && o[c] !== "");

const offresBonnes = offresBrutes.filter((o) => aTout(o, ["id", "kind", "title", "issuer", "country", "deadlineAt", "settleOn"]));
const seancesBonnes = seancesBrutes.filter((s) => aTout(s, ["id", "country", "instrument", "sessionOn"]));

/* Un semis amputé se voit tout de suite, plutôt qu'en cherchant une liste vide. */
if (process.env.GUICHET_SEMIS === "reference" && (offresBonnes.length < offresBrutes.length || seancesBonnes.length < seancesBrutes.length)) {
  console.warn(`Semis de référence incomplet : ${offresBrutes.length - offresBonnes.length} ligne(s) et ${seancesBrutes.length - seancesBonnes.length} séance(s) écartées, faute de champs indispensables. Relancer scripts/semis-reference.mjs.`);
}

/**
 * Le semis dense est un CHOIX, jamais le défaut.
 *
 * Six tests prennent le dépôt mémoire pour fixture et comptent sur les huit
 * lignes du jeu de démonstration. Verser cent une lignes dans leur socle les a
 * tous cassés d'un coup, et c'était juste : on ne déplace pas le socle d'une
 * suite parce qu'on voulait un environnement d'essai plus fourni. La densité
 * s'allume donc à la demande, et `npm run dev:memory` l'allume pour le
 * développement local comme pour l'essai.
 */
export const semisDense = (): boolean => process.env.GUICHET_SEMIS === "reference";

export const REF_OFFERS: Offer[] = semisDense() ? (offresBonnes as unknown as Offer[]) : [];
export const REF_AUCTIONS: AuctionResult[] = semisDense() ? (seancesBonnes as unknown as AuctionResult[]) : [];
/** Le jour où le semis a été relevé, pour que l'essai puisse le dire. */
export const REF_LE = (brut as { genere?: string }).genere ?? "";
