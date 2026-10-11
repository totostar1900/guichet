/**
 * LA VERSION DU LECTEUR, INSCRITE SUR CHAQUE LECTURE.
 *
 * Elle ne protège rien. Elle sert à SAVOIR, et ce manque a coûté une matinée
 * le 11 octobre 2026 : pour répondre à « la relecture des 212 bulletins
 * changerait-elle quelque chose ? », il a fallu reprendre les 212 PDF et les
 * repasser au lecteur, quinze minutes de machine, parce que rien en base ne
 * disait quel lecteur avait produit quelle lecture. La réponse était pourtant
 * déductible : une séance lue par le lecteur courant n'a rien à gagner.
 *
 * Avec cette colonne, « quelles séances méritent une relecture » devient une
 * requête. C'est le seul but, et il suffit.
 *
 * ELLE SE CHANGE À LA MAIN, et un cliquet le rappelle : src/test/
 * lecteur-version.test.ts garde l'empreinte des fichiers du lecteur et
 * refuse qu'ils bougent sans que le numéro bouge. Un numéro qui suivrait
 * automatiquement le contenu ne dirait plus rien d'intentionnel, et un numéro
 * qu'on oublie de lever est pire que pas de numéro : il ferait croire qu'une
 * séance est à jour.
 */

/**
 * Le lecteur du Bulletin Officiel de la Cote.
 *
 *   1  (jusqu'au 2026-10-05)  texte aplati, motifs par section.
 *   2  (2026-10-06, 02564bf)  lecture géométrique des obligations : pdfjs
 *                             rend les abscisses, 650 lignes rattrapées sur
 *                             141 séances.
 *   3  (2026-10-11)           le lecteur garde ses notes : le texte brut
 *                             qu'il n'a pas su lire, ce qu'il y cherchait, et
 *                             la page où il se trouve. Rien ne change dans ce
 *                             qu'il lit ; tout change dans ce qu'il sait dire
 *                             de ce qu'il n'a pas lu.
 *   4  (2026-10-11)           seconde identité pour les lignes amortissables :
 *                             le prix y est rapporté au DERNIER NOMINAL NON
 *                             NUL de la ligne et non à celui du jour, que le
 *                             bulletin imprime parfois à zéro. 78 remarques
 *                             sur 66 séances tenaient à ce seul nombre, qui
 *                             dormait en base depuis le premier jour.
 *   5  (2026-10-11)           la même seconde identité donnée au lecteur
 *                             GÉOMÉTRIQUE, qui refusait les lignes
 *                             amortissables pour la même raison : 81 des
 *                             refus mesurés sur les 48 séances de la famille
 *                             « ligne de cours non reconnue ».
 *   6  (2026-10-11)           la DÉLIMITATION de la rangée, qui était le
 *                             vrai goulot : on décolle la tête de
 *                             l'obligation suivante même sans montant à
 *                             décimales devant, on refuse d'avaler une tête
 *                             pendant l'accumulation, et les pourcentages
 *                             s'acceptent sans décimales comme les bulletins
 *                             anciens les impriment. Sur le gabarit du
 *                             25 avril 2024 : six obligations lues contre
 *                             douze, et aucun autre gabarit ne bouge.
 */
export const VERSION_DU_LECTEUR = 6;

/** Les fichiers qui FONT la lecture : eux seuls commandent le numéro. */
export const FICHIERS_DU_LECTEUR = ["src/lib/market/boc-parse.ts", "src/lib/market/boc-geometrie.ts"];

/**
 * Une lecture d'un lecteur plus ancien a peut-être quelque chose à gagner ;
 * une lecture du lecteur courant n'a rien à gagner, c'est certain.
 *
 * L'absence de numéro vaut « ancienne » : les 812 séances lues avant le
 * 11 octobre 2026 n'en portent pas, et les traiter comme à jour serait la
 * seule façon de rendre cette colonne menteuse dès sa naissance.
 */
export const lectureAncienne = (version?: number): boolean => (version ?? 0) < VERSION_DU_LECTEUR;
