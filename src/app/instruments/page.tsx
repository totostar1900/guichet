import { redirect } from "next/navigation";

/**
 * LE SOMMAIRE DES INSTRUMENTS A FERMÉ, le 24 octobre 2026.
 *
 * Il rangeait par instrument — la cote, les fonds, les séances — c'est-à-dire
 * par l'axe que `domain/services` avait explicitement écarté : personne ne se
 * réveille en voulant un OPCVM. Et le relevé est sans appel : les cinq
 * services du rayon « Placer » menaient DÉJÀ aux trois familles. Le siège les
 * nommait une seconde fois, par l'objet au lieu de l'intention.
 *
 * « /trader » porte maintenant les deux : les gestes, et les familles sur
 * lesquelles ils portent. Les trois pages ne bougent pas — « /titres »,
 * « /fonds », « /calendrier » gardent leur adresse, leurs colonnes et leurs
 * onglets de section. Seul le siège qui les abrite a changé de nom et
 * d'angle.
 *
 * Le compte par rubrique que cette page affichait — « 3 séances ouvertes »,
 * et jamais zéro — n'est pas perdu : c'est la même idée que les aperçus des
 * tuiles de Trade, qui disent ce qui attend derrière chacune.
 *
 * Redirection temporaire : voir la note de « /portefeuille », même raison.
 */
export default function InstrumentsDeplaces() {
  redirect("/trader");
}
