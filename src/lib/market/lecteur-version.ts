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
 *  10  (2026-10-13)           LA DATE RESTÉE EN NUMÉRO DE SÉRIE EXCEL, et
 *                             c'est Georges qui l'a vue. Là où les quarante
 *                             autres fonds impriment une date, la rangée de
 *                             FCP ECOBANK OBLIGATAIRE CEMAC imprime
 *                             « 46 120,00 » : le bulletin sort d'un tableur
 *                             et cette cellule n'a jamais reçu son format.
 *                             46120 est le 8 avril 2026.
 *                             TROIS FOIS LA MAUVAISE DIMENSION : j'avais
 *                             élargi les séparateurs puis les barres, des
 *                             tolérances sur la FORME ; la veille, la
 *                             seconde passe avait appris que le défaut était
 *                             la POSITION. Ici ce n'est ni l'une ni l'autre,
 *                             c'est le TYPE de la cellule.
 *                             Mesuré sur les 805 séances : 65 des 68 débris
 *                             restants, un seul fonds, une seule colonne,
 *                             celle de la date précédente. Zéro série
 *                             ailleurs, donc ce n'est pas l'export qui est
 *                             cassé, c'est une cellule mal typée à la
 *                             source.
 *                             CE QUI REND LA RÉPARATION SÛRE est le
 *                             troisième garde et lui seul : une VL de
 *                             46 120 francs est plausible, mais la variation
 *                             imprimée sur la rangée ne s'accorde avec les
 *                             deux VL que si la lecture est la bonne. C'est
 *                             le bulletin qui valide sa réparation.
 *  11  (2026-10-13)           LA COQUILLE D ANNÉE DANS L AUTRE SENS, signalée
 *                             par Georges. Le bulletin de mai 2024 imprime
 *                             « 03/05/2025 » pour FCP ELITE CAPITAL RECORD et
 *                             FCP CCA PERFORMANCE : l année a été tapée une
 *                             de trop. La date corrigée, le 3 mai 2024, est
 *                             un VENDREDI, et ces deux fonds sont valorisés
 *                             chaque vendredi : leur série porte 04-12,
 *                             04-19, un trou de deux vendredis, puis 05-10.
 *                             La correction tombe dans le trou et les valeurs
 *                             voisines l encadrent.
 *                             CE QUI TIENT LA RÉPARATION EST UNE FENÊTRE DE
 *                             31 JOURS, et rien d autre. Retirer un an résout
 *                             toutes les fautes bien trop facilement, la
 *                             borne générale tolérant quatre cents jours de
 *                             retard : ce critère large acceptait seize des
 *                             vingt cas de la base, dont DOUZE fausses. Une
 *                             valeur précédente vieille de plus d un mois
 *                             n est pas une valeur précédente. La séparation
 *                             est franche : 5, 7, 10 et 11 jours d un côté,
 *                             276 jours au moins de l autre.
 *                             Trois témoins ont été essayés et écartés avant
 *                             celui-là : la date dominante de la séance (4
 *                             cas sur 20), la présence de la date chez un
 *                             autre fonds du jour, et la série propre du
 *                             fonds, qui ne peut rien témoigner puisque c est
 *                             le refus lui-même qui y creuse le trou.
 *                             VL-COQUILLE ENTRE AUSSI DANS L EMPREINTE du
 *                             lecteur, où son absence était un trou : ce
 *                             fichier décide si une VL est écrite, réparée ou
 *                             écartée, donc il change ce que la base
 *                             contient.
 *  12  (2026-10-13)           LA TABLE DE CAPITALISATION, LUE PAR LES
 *                             ABSCISSES, et la borne qui sépare deux tables.
 *                             Georges a dit des rangées refusées qu elles
 *                             « sont bien complètes ». Elles l étaient, et ce
 *                             n était pas la bonne table : la section
 *                             s appelle « CAPITALISATION BOURSIERE ET ENCOURS
 *                             DES TITRES DE DETTE » et en contient DEUX. La
 *                             première se ferme sur un total que l
 *                             aplatissement colle à ses chiffres
 *                             (« Total63 664 048 000438 928 687 500 »), que
 *                             « ^Total$ » ne reconnaissait pas : le lecteur
 *                             avalait alors deux cents lignes et lisait les
 *                             rangées BDEAC avec la grammaire des ACTIONS,
 *                             rendant « cours 5,45 » pour un taux de coupon
 *                             et « flottant 106 791 920 000 » pour un montant
 *                             levé. Rien n atteignait la base, l appariement
 *                             se faisant par ISIN, mais ces fausses lignes
 *                             empêchaient le lecteur de dire qu il n avait
 *                             rien lu.
 *                             LE VRAI MANQUE, lui, pesait un quart des
 *                             cotations d action : 1 253 sur 4 981, sans
 *                             flottant ni capitalisation ni dividende, sur
 *                             208 séances. Les abscisses rendent la table
 *                             proprement, et LA RANGÉE SE VÉRIFIE ELLE-MÊME :
 *                             cours × flottant = capitalisation flottante,
 *                             cours × total = capitalisation globale. C est
 *                             ce contrôle, et lui seul, qui écarte les
 *                             rangées de dette sans avoir à connaître la
 *                             frontière entre les deux tables.
 *                             Mesuré sur 812 séances : 208 où l aplatie ne
 *                             rend rien, 208 rendues, +1 002 lignes, ZÉRO
 *                             produit faux. Et 122 séances où la géométrie
 *                             lirait MOINS bien : on ne la consulte donc que
 *                             lorsque l aplatie ne rend rien, jamais en
 *                             remplacement.
 */
export const VERSION_DU_LECTEUR = 12;

/**
 * Les fichiers qui FONT la lecture : eux seuls commandent le numéro.
 *
 * VL-COQUILLE Y EST ENTRÉ LE 13 OCTOBRE 2026, et son absence était un trou.
 * Ce fichier décide si une valeur liquidative est écrite, réparée ou écartée :
 * il change donc ce que la base contient, exactement comme les deux autres.
 * Le cliquet ne le gardait pas, de sorte qu une modification de la règle de
 * reparation pouvait passer sans lever le numero, et des seances auraient
 * paru a jour alors qu une relecture leur aurait rendu quelque chose.
 */
export const FICHIERS_DU_LECTEUR = ["src/lib/market/boc-parse.ts", "src/lib/market/boc-geometrie.ts", "src/lib/market/vl-coquille.ts"];

/**
 * Une lecture d'un lecteur plus ancien a peut-être quelque chose à gagner ;
 * une lecture du lecteur courant n'a rien à gagner, c'est certain.
 *
 * L'absence de numéro vaut « ancienne » : les 812 séances lues avant le
 * 11 octobre 2026 n'en portent pas, et les traiter comme à jour serait la
 * seule façon de rendre cette colonne menteuse dès sa naissance.
 */
export const lectureAncienne = (version?: number): boolean => (version ?? 0) < VERSION_DU_LECTEUR;
