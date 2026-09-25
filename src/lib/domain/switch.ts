import type { Offer } from "./types";

/**
 * Le passage d'un fonds à un autre.
 *
 * Un client qui veut changer de fonds passait deux ordres sans rapport l'un
 * avec l'autre : un rachat, puis, s'il y pensait et quand il y pensait, une
 * souscription. Entre les deux, son argent était sorti du marché et personne ne
 * le lui rappelait. Le desk voyait passer deux ordres qu'aucun lien ne
 * rapprochait : il ne pouvait ni préparer le second, ni s'apercevoir que le
 * client avait oublié de le passer.
 *
 * Un passage n'est pourtant pas un instrument de plus. C'est un fil entre deux
 * ordres ordinaires, qui restent exécutés, documentés et réglés par la
 * machinerie qui existe. Le rachat porte la destination que le client a
 * choisie ; la souscription, une fois le produit connu, porte le rachat dont
 * elle l'emploie.
 *
 * Les deux temps ne sont pas un défaut de conception, ils sont la réalité : le
 * montant de la souscription vaut les parts rachetées à leur valeur liquidative
 * nette des droits de sortie, et cette valeur se publie après. Promettre un
 * montant au moment de l'instruction serait inventer un chiffre.
 */

/** Ce qui empêche ce passage, ou rien. */
export function switchBlock(from: Offer, to: Offer | undefined): string | null {
  if (!to) return "Le fonds de destination est introuvable.";
  if (from.kind !== "FONDS") return "Un passage part d'un fonds.";
  if (to.kind !== "FONDS") return "Un passage arrive sur un fonds.";
  if (to.id === from.id) return "Le fonds de destination est le fonds de départ.";
  if (to.hidden || to.status === "withdrawn") return "Ce fonds n'est plus proposé.";
  // Un fonds lu au bulletin mais sans convention de distribution ne se souscrit
  // pas : le proposer comme destination promettrait une opération qui n'existe pas.
  if (!to.fund?.distributed) return "Ce fonds n'est pas encore distribué par la maison.";
  return null;
}

/**
 * Le produit d'un rachat, tel qu'il part en souscription.
 *
 * `positionFor` compte ce que le client reçoit en négatif, parce qu'il compte du
 * point de vue de ce qu'il faut régler. Le passage a besoin du même chiffre dans
 * l'autre sens, et arrondi au franc : une souscription se libelle en francs
 * entiers, et la fraction perdue vaut mieux qu'un montant que la banque ne sait
 * pas virer.
 */
export function switchProceeds(total: number): number {
  return Math.max(0, Math.floor(-total));
}

/** Les fonds que le client peut viser depuis celui-ci. */
export function switchTargets(from: Offer, offers: Offer[]): Offer[] {
  return offers.filter((o) => switchBlock(from, o) == null).sort((a, b) => a.title.localeCompare(b.title));
}
