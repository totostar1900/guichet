/**
 * La courbe que la BEAC publie, relevée dans son tracé.
 *
 * Elle paraît chaque mois dans les « Statistiques Mensuelles du Marché des
 * valeurs du Trésor de la CEMAC », page 5, pour trois Trésors seulement :
 * Cameroun, Congo, Gabon. Ce sont exactement les trois que nos propres données
 * permettent d'ajuster, ce qui est une confirmation extérieure de notre constat
 * de disponibilité.
 *
 * Elle est publiée comme un graphique, sans table et sans note de méthode. Ces
 * chiffres ne sont donc pas recopiés d'une source chiffrée : ils sont relevés
 * dans le tracé vectoriel du PDF par scripts/beac-courbe-extraire.mjs, et
 * ramenés en pour cent par les graduations de l'axe, dont les positions sont
 * elles aussi dans le document. Rien n'est estimé à l'œil, et l'échelle se
 * vérifie : les cinq graduations retenues sont colinéaires à 10,825 pixels par
 * point de pourcentage.
 *
 * DEUX AVERTISSEMENTS, sans lesquels la superposition ment.
 *
 * Son abscisse est la DURÉE D'ÉMISSION, la nôtre la VIE RESTANTE. Chez elle une
 * obligation émise à sept ans reste posée à « 7 ans » toute sa vie ; chez nous
 * elle glisse vers la gauche à mesure qu'elle approche de son terme. Les deux
 * axes ne portent donc pas la même grandeur, et ne coïncident que pour un titre
 * neuf.
 *
 * Son univers est l'ENCOURS, le nôtre les ADJUDICATIONS RELUES. Elle dit ce que
 * la dette vivante coûte en moyenne, nous ce que le marché a facturé à la
 * dernière séance. Les deux sont justes et ne répondent pas à la même question.
 */

export interface CourbeBeac {
  /** Le mois de la publication, tel qu'elle le date. */
  arreteLe: string;
  /** Le numéro du bulletin mensuel. */
  numero: number;
  /** Le jour où nous avons relevé le tracé. */
  releveLe: string;
  source: string;
  /** Par Trésor, le taux en pour cent à chaque durée d'émission, en années. */
  pays: Record<string, { annees: number; pct: number }[]>;
}

/**
 * Les durées, rangées : Object.entries ne les rend pas dans l'ordre écrit.
 *
 * Il rend d'abord les clefs entières en ordre numérique croissant, puis les
 * autres dans leur ordre d'insertion. « { 0.25, 0.5, 1, 1.5, 2 } » ressort donc
 * « 1, 2, 0.25, 0.5, 1.5 », et une polyligne tracée dans cet ordre court
 * jusqu'au bout, revient d'un bond à l'extrême gauche et repart. C'est ce qui
 * dessinait trois courbes de la BEAC là où il n'y en a qu'une.
 */
const serie = (o: Record<number, number>) =>
  Object.entries(o)
    .map(([a, pct]) => ({ annees: Number(a), pct }))
    .sort((x, y) => x.annees - y.annees);

export const BEAC_COURBE: CourbeBeac = {
  arreteLe: "2026-07-31",
  numero: 60,
  releveLe: "2026-09-29",
  source: "https://www.beac.int/wp-content/uploads/2021/10/Statistiques-mensuelles-juillet-2026.pdf",
  pays: {
    Cameroun: serie({ 0.25: 6.55, 0.5: 7.35, 1: 8.44, 1.5: 9.08, 2: 9.45, 3: 9.78, 3.5: 9.85, 4: 9.89, 5: 9.92, 6: 9.92, 7: 9.9, 8: 9.9, 9: 9.89, 10: 9.88, 11: 9.88, 12: 9.88, 13: 9.87, 14: 9.87, 15: 9.87 }),
    Congo: serie({ 0.25: 6.69, 0.5: 8.0, 1: 9.85, 1.5: 11.05, 2: 11.81, 3: 12.67, 3.5: 12.91, 4: 13.08, 5: 13.31, 6: 13.44, 7: 13.54, 8: 13.59, 9: 13.65, 10: 13.69 }),
    Gabon: serie({ 0.25: 6.16, 0.5: 7.71, 1: 9.52, 1.5: 10.25, 2: 10.41, 3: 10.03, 3.5: 9.73, 4: 9.42, 5: 8.86, 6: 8.42, 7: 8.08, 8: 7.8, 9: 7.59, 10: 7.41 }),
  },
};
