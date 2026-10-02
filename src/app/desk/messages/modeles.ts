import "server-only";
import { preparedMessages } from "@/lib/documents/messages";
import type { IntentState } from "@/lib/domain/types";

/**
 * Les modèles de réponse, apportés dans la boîte aux lettres.
 *
 * POURQUOI ICI. Le registre existe depuis longtemps, au Référentiel › Modèles :
 * texte en vigueur, version, relecture, historique. Il ne servait que sur la
 * fiche d'un ordre. Or « il manque des pièces à votre dossier » se réécrit vingt
 * fois par semaine depuis la boîte aux lettres, et réécrite vingt fois la même
 * règle finit par se dire de vingt façons, dont certaines promettent ce que la
 * maison ne tient pas. Le desk possède ses mots : ils viennent le rejoindre là
 * où il écrit.
 *
 * LA SIGNATURE DU CADRE EST RETIRÉE, et c'est la seule subtilité du fichier.
 * Le cadre du Référentiel finit par « {conseiller} · {societe} », tandis que ce
 * fil signe déjà de son côté, à l'envoi. Inséré tel quel, un modèle partirait
 * signé deux fois. On remplit donc le cadre avec une signature vide, puis on
 * laisse tomber les dernières lignes qui ne portent plus ni lettre ni chiffre.
 *
 * Si le desk réécrit le cadre de sorte que sa signature ne soit plus en
 * dernier, le doublon reparaîtra : l'aperçu de relecture le montrera, puisqu'il
 * montre le message exact. C'est précisément à cela qu'il sert.
 */
export type ModeleDuFil = {
  key: string;
  label: string;
  hint: string;
  /** Ce que l'opérateur doit préciser avant d'envoyer, quand le modèle l'exige. */
  askNote?: string;
  texte: string;
};

/**
 * Retire les dernières lignes vides de sens : une fois la signature remplie par
 * du vide, il ne reste qu'un séparateur, et un séparateur seul n'est pas une
 * ligne de message.
 */
export function sansSignature(texte: string): string {
  const lignes = texte.split("\n");
  while (lignes.length && !/[\p{L}\p{N}]/u.test(lignes[lignes.length - 1])) lignes.pop();
  return lignes.join("\n").trimEnd();
}

/**
 * `state` ne filtre rien : il met en tête les modèles que cet état appelle. Un
 * fil sans ordre reçoit donc la liste entière, dans l'ordre du premier état.
 * `{precision}` reste en place : elle appartient à l'opérateur, pas à l'ordre.
 */
export async function modelesDuFil(state: IntentState | undefined, vars: Record<string, string | undefined>): Promise<ModeleDuFil[]> {
  const prepares = await preparedMessages(state ?? "recue", { ...vars, conseiller: "", societe: "" });
  return prepares.map((m) => ({ key: m.key, label: m.label, hint: m.hint, askNote: m.askNote, texte: sansSignature(m.text) }));
}
