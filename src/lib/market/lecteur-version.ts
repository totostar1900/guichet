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
 *  13  (2026-10-13)           LA SECONDE TABLE, L ENCOURS DES TITRES DE
 *                             DETTE, lue elle aussi par les abscisses. La
 *                             version 12 avait appris a s arreter devant
 *                             elle ; celle-ci apprend a la lire.
 *                             POURQUOI ELLE COMPTE PLUS QUE SON VOLUME. Les
 *                             adjudications donnent des FLUX et notre
 *                             collecte n en couvre qu un quart : tout ratio
 *                             bati dessus est faussement precis. Cette table
 *                             publie le STOCK, ligne par ligne, a chaque
 *                             seance, et un stock publie est complet par
 *                             construction. C est la seule route honnete vers
 *                             le mur des echeances tant que la collecte reste
 *                             partielle.
 *                             L IDENTITE QUI GARDE LA LECTURE a ete posee
 *                             FAUSSE DEUX FOIS avant d etre trouvee. « titres
 *                             × nominal = encours » n est vrai qu au pair :
 *                             treize lignes sur trente et une l etaient, les
 *                             dix-huit autres etaient refusees. La colonne s
 *                             appelle « Encours calcule a ce jour », ce qui
 *                             se lisait. La bonne identite est
 *                             titres × nominal × cours / 100 = encours, et c
 *                             est elle qui choisit entre les recollements
 *                             quand la grille coupe un nombre en deux
 *                             (« 23 500 000 » en « 23 » et « 500 000 »).
 *                             LA TOLERANCE EST D UNE UNITE DU DERNIER
 *                             DECIMAL, pas d une demie : ALIOS-06 imprime un
 *                             nominal de 8888,889 et calcule son encours avec
 *                             8888,89, soit 613 francs d ecart sur 612 955
 *                             titres. Le bulletin arrondit le meme nombre de
 *                             deux facons dans une seule rangee.
 *                             Mesure sur la seance du 12 octobre : 31 lignes,
 *                             ZERO refus, et sept emetteurs dont le Gabon a
 *                             677 Mds et la BDEAC a 253.
 *  14  (2026-10-13)           TROIS DEFAUTS DE LA TABLE D ENCOURS, ET UNE
 *                             SEULE LECON : un controle A L INTERIEUR d une
 *                             rangee ne voit pas une erreur qui conserve son
 *                             invariant, ni un champ qu il n utilise pas.
 *                             Aucun des trois n etait visible sur la seance
 *                             que j avais lue a la main ; il a fallu ecrire
 *                             les 807 pour qu ils sortent.
 *
 *                             UN NOMBRE S ARRETE A SA DECIMALE, IL NE
 *                             S INTERDIT PAS. Le recollement refusait toute
 *                             cellule portant une virgule, donc « 6 » et
 *                             « 666,67 » ne pouvaient jamais se rejoindre :
 *                             le nominal 6 666,67 du Congo n existait meme
 *                             pas parmi les candidats, et la seule decoupe
 *                             possible etait la fausse, 113 230 006 titres a
 *                             666,67. Elle satisfait l identite a onze
 *                             millioniemes pres, PARCE QU UN CHIFFRE QUI
 *                             TRAVERSE la frontiere titres / nominal
 *                             conserve le produit. 98 seances signees.
 *
 *                             LE SECOND INVARIANT ETAIT DANS LA RANGEE
 *                             DEPUIS LE DEBUT : montant leve / titres est le
 *                             nominal d origine, et il vaut EXACTEMENT
 *                             10 000 sur les 16 712 rangees saines, minimum
 *                             comme maximum. La decoupe fautive donne
 *                             999,999947. On ne demande qu un entier, une
 *                             cote pouvant changer de nominal ; une
 *                             recombinaison fausse, elle, ne tombe jamais
 *                             rond.
 *
 *                             LA CELLULE DE L ISIN PORTE DU TEXTE AVANT ET
 *                             APRES LUI, une seule cause pour deux defauts.
 *                             Apres, le mnemonique : « CM0000020107 ECMR5 ».
 *                             Le lecteur prenait la cellule SUIVANTE, qui est
 *                             le taux, et 2 533 rangees sur 16 915, QUINZE
 *                             POUR CENT, portaient « 6,25 » en guise de
 *                             mnemonique sur 484 seances. Avant, la
 *                             designation : « BDEAC 5.45% NET 2020 - 2027
 *                             CG0000020220 », et la ligne EBD01 est restee
 *                             SANS DESIGNATION pendant 767 seances, toute sa
 *                             vie cotee, sans que rien proteste.
 *
 *  15  (2026-10-13)           LE MONTANT RENDU EN DATE, qui est l inverse du
 *                             defaut de la version 10 et que Georges a vu
 *                             dans le classeur. Un numero de serie imprime la
 *                             ou une date est attendue se corrigeait depuis
 *                             la 10 ; une date imprimee la ou un MONTANT est
 *                             attendu passait pour une VL trop ancienne.
 *
 *                             LE MOTIF MENTAIT, comme celui que ce module
 *                             avait deja corrige une fois : « anterieure a la
 *                             seance de plus de quatre cents jours » decrit
 *                             une date, or il n y a aucune date dans cette
 *                             cellule. Le desk lisait une donnee perimee la
 *                             ou la bourse publie une donnee corrompue, et ce
 *                             n est pas le meme interlocuteur.
 *
 *                             LA PREUVE EST ARITHMETIQUE. Les fonds de la
 *                             zone naissent a 10 000 francs, donc leurs
 *                             valeurs lues comme numeros de serie tombent
 *                             entre 1924 et 1954 : une VL anterieure a l an
 *                             2000 n a jamais ete une date. Mesure sur les
 *                             sept rangees de la base en reconvertissant
 *                             chacune et en la confrontant a la serie du
 *                             fonds : 1927-07-17 vaut 10 060 contre une VL
 *                             reelle de 10 060,33 ; 1936-01-10 vaut 13 159
 *                             contre 13 159,79 ; 1934-07-25 vaut 12 625
 *                             contre 12 625,52 ; 1932-06-16 vaut 11 856
 *                             contre 11 856,64 ; 1934-07-22 vaut 12 622
 *                             contre 12 622,81 ; 1930-11-19 vaut 11 281
 *                             contre 11 281,15. SEPT SUR SEPT, et l ecart est
 *                             toujours negatif et inferieur au franc : le
 *                             rendu en date TRONQUE les centimes.
 *
 *                             LA VARIATION IMPRIMEE NE PEUT PAS SERVIR DE
 *                             GARDE ICI, contrairement a la version 10 : la
 *                             bourse la calcule sur la cellule corrompue, 362
 *                             pour cent chez AB CASH. Le second invariant est
 *                             la serie du fonds, qui ne lui doit rien.
 *
 *                             ON NE REECRIT RIEN POUR AUTANT. Le montant
 *                             reconstruit est une partie entiere, donc moins
 *                             bon que la VL au centime que la serie porte
 *                             deja : l ecrire remplacerait une valeur juste
 *                             par une valeur tronquee. La reconstruction sert
 *                             de PREUVE au fournisseur, pas de valeur en base.
 *
 *  16  (2026-10-14)           LA RANGÉE COUPÉE EN DEUX HAUTEURS, et le
 *                             seuil qu on n a PAS touche. Du 14 avril au
 *                             2 juin 2023, quatre lignes par seance sont
 *                             imprimees sur deux hauteurs separees de TROIS
 *                             points la ou le regroupement en tolere deux et
 *                             demi : l identite du titre reste en haut, les
 *                             dix-sept nombres tombent juste en dessous, et
 *                             aucune des deux moities n est lisible seule.
 *
 *                             PASSER LA TOLERANCE A TROIS ETAIT L EVIDENCE,
 *                             et Georges a dit non. Il avait raison : les
 *                             lignes d en-tete de ces memes bulletins ne sont
 *                             separees que de 4,4 points, donc une tolerance
 *                             a trois les fusionnerait deux a deux. Un seuil
 *                             deplace pour un cas agit sur tous les autres,
 *                             et personne ne les mesure.
 *
 *                             LA FORME NE DISCUTE AVEC PERSONNE. Une rangee
 *                             qui porte un ISIN et AUCUNE date n est pas une
 *                             ligne de cours : c est une moitie. Une rangee
 *                             voisine qui porte une date et AUCUN ISIN est l
 *                             autre. Les deux conditions ensemble ne
 *                             decrivent rien d autre, quelle que soit la
 *                             distance. C est la meme methode que la queue
 *                             qui deborde, etendue au cas ou c est la tete
 *                             qui reste seule.
 *
 *                             MESURE EN REGRESSION, les deux versions du
 *                             lecteur sur le MEME texte dans le meme
 *                             processus, 150 seances reparties sur tout le
 *                             corpus, une sur cinq : 16 GAGNEES, ZERO
 *                             PERDUE, ZERO CHANGEE. Le zero du milieu est
 *                             celui qui compte, la regle ne touche jamais
 *                             une rangee deja lue. La premiere mesure
 *                             comparait le lecteur a la BASE et rendait 120
 *                             ecarts : c etaient des fautes preexistantes du
 *                             lecteur aplati, et la question posee s y
 *                             noyait. Relecture contre regression, une fois
 *                             de plus.
 *
 *                             Les valeurs gagnees ont ete confrontees a une
 *                             feuille relue par Georges sur la piece : elles
 *                             correspondent cellule pour cellule.
 *
 *  17  (2026-10-14)           LE PIVOT DE LA JONCTION EST LE STATUT, ET NON
 *                             LA DATE. La 16 posait la condition sur la
 *                             date absente : elle voyait AVRIL, ou la moitie
 *                             haute ne porte que l identite, et manquait MAI,
 *                             ou elle porte l identite ET la date, les
 *                             nombres seuls tombant en dessous. Mesure apres
 *                             relecture : les deux seances d avril entrees,
 *                             refus a zero ; les cinq de mai revenues
 *                             inchangees, quatre refus chacune.
 *
 *                             LE STATUT EST CE QUE LE CONSTRUCTEUR EXIGE DE
 *                             TOUTE FACON. Une rangee qui porte un ISIN sans
 *                             statut n est jamais une ligne de cours
 *                             complete, quelle que soit la facon dont la
 *                             coupure est tombee : la condition cesse de
 *                             decrire une mise en page pour decrire un
 *                             manque, et elle couvre les deux.
 *
 *                             Regression sur 200 seances : 109 GAGNEES, ZERO
 *                             PERDUE, ZERO CHANGEE, soit sept fois le gain
 *                             de la 16. La coupure en deux hauteurs touche
 *                             donc bien plus de seances que les quinze qui
 *                             portaient une remarque, parce que le lecteur
 *                             aplati y reussissait et que personne ne
 *                             demandait rien a la geometrie.
 *
 *                             LA 16 N A VECU QU UNE HEURE, et c est le
 *                             mecanisme qui fonctionne : sept seances
 *                             portaient deja son estampille, dont les cinq
 *                             de mai qui n avaient rien gagne. Les laisser
 *                             en 16 les ferait passer pour a jour.
 */
export const VERSION_DU_LECTEUR = 17;

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

/**
 * TROIS LECTEURS SOUS UN SEUL NUMÉRO, ET CE QUE ÇA COÛTE.
 *
 * `FICHIERS_DU_LECTEUR` en garde trois, qui lisent trois choses différentes :
 * les cotations, les valeurs liquidatives et l'encours de la dette. Le numéro,
 * lui, est unique. Une correction qui ne touche que l'encours marque donc
 * TOUTES les séances comme périmées, y compris pour deux lecteurs qui n'ont
 * pas bougé d'une ligne.
 *
 * Mesuré le 13 octobre 2026, et cher : j'ai lancé une relecture des 813
 * bulletins « avant d'envoyer le rapport au fournisseur », en croyant que les
 * remarques dataient d'un lecteur corrigé depuis. Les montées 13 et 14 ne
 * touchent que l'encours, qui a son propre écrivain et était déjà à jour. Les
 * douze séances relues avant l'arrêt n'ont rien changé : 18 576 cotations
 * d'obligation, 16 915 encours, 439 remarques, à l'identique. Deux heures et
 * demie et huit cents PDF pour un numéro.
 *
 * LE CLIQUET SE TROMPAIT DANS LE BON SENS, et c'est le bon réglage : mieux
 * vaut relire pour rien que croire à jour ce qui ne l'est pas. Mais un cliquet
 * qui réclame pour rien finit par ne plus être écouté, ce qui est la panne
 * suivante. D'où ce tableau : chaque montée déclare CE QU'ELLE A TOUCHÉ, et
 * la question « faut-il relire ? » se pose enfin par lecteur.
 *
 * UNE VERSION NON DÉCLARÉE EST RÉPUTÉE AVOIR TOUT TOUCHÉ. L'oubli coûte alors
 * une relecture inutile, jamais une lecture périmée tenue pour fraîche. Et un
 * cliquet exige la déclaration, sans quoi le tableau prendrait exactement le
 * retard que ce module cherche à supprimer.
 */
export type Lecteur = "cotations" | "vl" | "encours";
export const LECTEURS: Lecteur[] = ["cotations", "vl", "encours"];

export const NOM_DU_LECTEUR: Record<Lecteur, string> = {
  cotations: "cotations et capitalisation",
  vl: "valeurs liquidatives",
  encours: "encours de la dette",
};

/** La plus ancienne montée déclarée : en deçà, on ne sait pas, donc on relit tout. */
export const PREMIERE_VERSION_DECLAREE = 8;

export const TOUCHE_PAR_VERSION: Record<number, Lecteur[]> = {
  8: ["cotations"], // la queue du millésime, sur les obligations
  9: ["vl"], // la seconde passe sur le débris, table des OPCVM
  10: ["vl"], // la date restée en numéro de série Excel
  11: ["vl"], // la coquille d'année dans l'autre sens
  12: ["cotations"], // la table de capitalisation, lue par les abscisses
  13: ["encours"], // la seconde table, l'encours des titres de dette
  14: ["encours"], // trois défauts de la table d'encours
  15: ["vl"], // le montant rendu en date, inverse du défaut de la 10
  16: ["cotations"], // la rangée coupée en deux hauteurs, jointe par sa forme
  17: ["cotations"], // le pivot de la jonction : le statut, et non la date
};

/**
 * Une relecture rendrait-elle quelque chose À CE LECTEUR ?
 *
 * C'est la seule question qui justifie du temps machine. « La version n'est
 * pas la dernière » n'en est pas une.
 */
export function relectureUtile(version: number | undefined, pour: Lecteur): boolean {
  const v = version ?? 0;
  if (v < PREMIERE_VERSION_DECLAREE) return true;
  for (let n = v + 1; n <= VERSION_DU_LECTEUR; n++) {
    const touche = TOUCHE_PAR_VERSION[n];
    if (!touche || touche.includes(pour)) return true;
  }
  return false;
}

/** Les lecteurs pour lesquels une relecture de cette séance rendrait quelque chose. */
export const lecteursARelire = (version?: number): Lecteur[] => LECTEURS.filter((l) => relectureUtile(version, l));
