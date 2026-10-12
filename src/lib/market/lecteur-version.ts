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
 *   7  (2026-10-12)           les ACTIONS lues par la géométrie, avec leurs
 *                             deux identités : les seuils valent le cours
 *                             précédent ± 10 % (4 302 cotations sur 4 843) et
 *                             la variation annoncée vaut celle que la clôture
 *                             donne (4 917 sur 4 968). Le 22 décembre 2023,
 *                             LA REGIONALE est rendue à 42 500 sans que
 *                             personne ne tape un chiffre.
 *   8  (2026-10-12)           la QUEUE DU MILLÉSIME. Deux conditions de la
 *                             lecture géométrique supposaient la mise en page
 *                             récente : six valeurs après le statut, et des
 *                             seuils à ± 6 % du cours précédent. En 2023 la
 *                             queue en compte parfois quatre, et ces colonnes
 *                             portent le plus haut et le plus bas DE LA
 *                             SÉANCE, donc le cours précédent quand rien n'a
 *                             traité. Les deux conditions deviennent ce
 *                             qu'elles auraient toujours dû être : des
 *                             un encadrement : les seuils tiennent DANS la
 *                             bande de réservation, qu'ils la soient ou qu'ils
 *                             soient les extrêmes de la séance, et ils
 *                             encadrent l'ouverture et la clôture. Vrai des
 *                             deux millésimes, et plus sévère que l'égalité
 *                             sur un point : une queue mal ALIGNÉE se voit.
 *                             Mesuré en faisant tourner les deux versions du
 *                             lecteur sur le même texte, dans le même
 *                             processus, sur les 808 séances de la base :
 *                             +68 obligations en 2023 (123 séances), et zéro
 *                             perdue, zéro valeur changée sur 2023, 2024,
 *                             2025 et 2026. Les deux lignes les plus trouées
 *                             de la base, CG0000020261 et CG0000020329,
 *                             regagnent 27 séances chacune.
 *   9  (2026-10-12)           LA SECONDE PASSE SUR LE DÉBRIS, pour la table
 *                             des OPCVM. L'expression de la queue exige
 *                             celle-ci en FIN de tampon, et l'aplatissement
 *                             du PDF colle parfois le nom de la rangée
 *                             suivante derrière : la rangée, pourtant
 *                             conforme, n'est jamais testée à cette position.
 *                             Le défaut n'était pas la forme, c'était la
 *                             POSITION, et deux tolérances posées sur la
 *                             forme n'avaient rien rendu. On réessaie donc la
 *                             queue sur le texte qu'on allait jeter, qui se
 *                             termine exactement là où il faut, et c'est là
 *                             seulement que trois défauts d'impression se
 *                             tolèrent sans risque : la barre manquante
 *                             (« 1312/2024 »), la barre en trop
 *                             (« 06/12//2024 ») et la variation unique.
 *                             Mesuré par les deux lecteurs sur le même
 *                             texte, sur les 797 séances de la base :
 *                             +13 fonds, ZÉRO perdu, et les remarques
 *                             « ligne ignorée » de 92 à 68. Trois valeurs
 *                             changent, toutes sur FCP HARVEST ACTIONS
 *                             CEMAC les 30 et 31 décembre 2024 et le
 *                             2 janvier 2025, et ce sont trois
 *                             CORRECTIONS : le bulletin imprime
 *                             « 118 544,77 06/12//2024 118 317,84
 *                             20/12/2024 … -0,19% », la nouvelle lecture
 *                             rend cette ligne telle quelle et la
 *                             variation imprimée la vérifie, l'ancienne
 *                             rendait une précédente qui n'y est pas.
 */
export const VERSION_DU_LECTEUR = 9;

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
