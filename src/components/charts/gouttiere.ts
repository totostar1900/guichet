/**
 * LA GOUTTIÈRE DE GAUCHE SE TAILLE SUR SON ÉTIQUETTE LA PLUS LONGUE.
 *
 * Les graduations d'un graphique s'écrivent alignées à droite sur « padL - 6 ».
 * Une gouttière fixe tient tant que les nombres restent courts, et c'est
 * exactement ce qui finit par mordre : mesuré dans le navigateur le 5 octobre
 * 2026, vue des capitalisations à 375 px, « 1 364,8 Md » et « 1 819,7 Md »
 * commençaient à cinq pixels À GAUCHE du bord du dessin. Elles demandaient 50
 * unités pour 46 disponibles, leur premier chiffre sortait du viewBox, et on
 * lisait « 364,8 Md » pour 1 364,8. Aucune erreur, aucun débordement visible :
 * une panne muette de plus, et celle-ci a fait croire que le graphique
 * plafonnait à 962,7 quand l'indice valait 1 138,71.
 *
 * LA LARGEUR SE CALCULE, ELLE NE SE DEVINE PAS. Mesuré à 10 px de fonte,
 * `.tick` : dix caractères font cinquante unités, donc cinq par caractère
 * (l'espace insécable et la virgule un peu moins, le chiffre un peu plus, ça
 * s'équilibre). On ajoute les six unités de l'alignement et deux de marge.
 *
 * Le plancher reste celui que la vue s'était donné : une gouttière ne doit pas
 * rétrécir sous les nombres courts, sinon l'axe des dates se déplace d'une vue
 * à l'autre.
 */
export const PAR_CARACTERE = 5;

export const gouttiere = (etiquettes: string[], mini = 46) => Math.max(mini, 8 + PAR_CARACTERE * Math.max(0, ...etiquettes.map((s) => s.length)));
