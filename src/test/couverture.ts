import { translatable } from "@/i18n/core";

/**
 * CE QUE LE DICTIONNAIRE NE COUVRE PAS, DANS UNE PHRASE FABRIQUÉE.
 *
 * Les phrases composées avec des chiffres traversent t() sous forme de
 * variable : le scanner de clefs ne peut pas les voir, et elles peuvent rester
 * en français dans une interface anglaise sans que rien ne le signale. C'est la
 * forme que prend ici la panne muette.
 *
 * La question posée est une couverture et non une ressemblance. « Cette phrase
 * a-t-elle l'air française » est un détecteur, et ce détecteur-là a échoué deux
 * fois dans ce dépôt ; « le dictionnaire connaît-il cette clef, exactement ou
 * par gabarit » est un fait.
 *
 * Un segment fait de chiffres, d'unités et de ponctuation se lit pareil dans
 * les deux langues : la règle qui le déclare neutre est étroite, et elle ne
 * peut pas avaler une vraie phrase, puisque toute phrase porte d'autres
 * lettres.
 */
const SIGNES = "\\d\\s\\u202f\\u00a0.,:;·+%()≈±/–—-";
/**
 * Les dates sont neutres par mécanisme, et non par chance : le traducteur a sa
 * propre table pour les abréviations de mois et de jours. Elle est listée ici
 * en toutes lettres plutôt que devinée, pour qu'une phrase ne puisse pas s'y
 * glisser : « 8 avr. 2027 » passe, « servi le 8 avr. 2027 » non.
 */
const DATE = "janv\\.|févr\\.|mars|avr\\.|mai|juin|juil\\.|août|sept\\.|oct\\.|nov\\.|déc\\.|lun\\.|mar\\.|mer\\.|jeu\\.|ven\\.|sam\\.|dim\\.|éch\\.|h";
const NEUTRE = new RegExp(`^[${SIGNES}]*((FCFA|%|T\\+\\d+|${DATE})[${SIGNES}]*)*$`);

/** Le séparateur que le traducteur sait couper, et le seul sur lequel on découpe. */
const SEPARATEUR = " · ";

export function segmentsDecouverts(phrase: string | null | undefined): string[] {
  if (!phrase) return [];
  return phrase
    .split(SEPARATEUR)
    .map((p) => p.trim())
    .filter((p) => p && !NEUTRE.test(p) && !translatable(p));
}

/** Tous les segments non couverts d'un lot de phrases, sans doublons, dans l'ordre de rencontre. */
export function inventaire(phrases: (string | null | undefined)[]): string[] {
  const vus = new Set<string>();
  for (const p of phrases) for (const s of segmentsDecouverts(p)) vus.add(s);
  return [...vus];
}
