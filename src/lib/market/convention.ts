import "server-only";
import { cookies } from "next/headers";
import type { Convention } from "./yield";

/**
 * LA CONVENTION DE RENDEMENT, CHOISIE UNE FOIS POUR TOUT LE DESK.
 *
 * Un bon est précompté : son rendement se déduit de l'escompte, et la façon
 * de compter les jours change le résultat de 0,125 point en médiane sur nos
 * 132 bons. Le Guichet compte l'escompte en exact/360 et capitalise en
 * exact/365 ; la BEAC applique l'identité simple de son bulletin trimestriel.
 * Les deux sont justes.
 *
 * POURQUOI UN TÉMOIN ET NON UN RÉGLAGE D'ADRESSE. Les réglages de ce desk
 * vivent dans l'URL, et c'est la bonne règle pour un filtre : il ne concerne
 * que la page qu'on regarde. Une convention de calcul, elle, ne vaut rien si
 * elle change d'une page à l'autre : lire la courbe à la BEAC et le tableau
 * au Guichet, c'est comparer deux chiffres qui ne mesurent pas la même chose,
 * et c'est exactement le piège que ce choix sert à éviter. Elle suit donc le
 * lecteur d'une page à l'autre, comme la palette, et le serveur la lit à
 * chaque rendu.
 *
 * LE LECTEUR VIT ICI ET L'ACTION À CÔTÉ. Un fichier « use server » n'exporte
 * que des actions : y laisser cette fonction la faisait disparaître à la
 * compilation, et la page ne trouvait plus son import.
 */
export const CONVENTION_COOKIE = "rdt";

/** Ce que le lecteur a choisi, lu par le serveur à chaque rendu. */
export async function lireConvention(): Promise<Convention> {
  const jar = await cookies();
  return jar.get(CONVENTION_COOKIE)?.value === "beac" ? "beac" : "guichet";
}
