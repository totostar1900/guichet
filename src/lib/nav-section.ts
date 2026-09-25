/**
 * À quelle section du menu appartient une adresse.
 *
 * Une fiche vit sous « /offres », quel que soit l'instrument. Les deux barres
 * de navigation en déduisaient « Titres », si bien qu'ouvrir un fonds depuis la
 * liste des fonds rallumait la première icône : le lecteur se voyait ailleurs
 * qu'où il était.
 *
 * Une fiche de fonds porte un identifiant préfixé « fund- », posé à la lecture
 * du bulletin (voir `offerFromNav`), et c'est la seule marque que l'adresse
 * porte. Les quarante-cinq fonds en base l'ont, et aucune autre ligne.
 *
 * La règle vit ici pour que la barre du téléphone et celle de l'écran large ne
 * puissent pas en tenir deux versions.
 */
const FUND_FICHE = "/offres/fund-";

/** La liste des fonds, et la fiche d'un fonds. */
export const isFundsSection = (path: string): boolean => path.startsWith("/fonds") || path.startsWith(FUND_FICHE);

/** L'accueil et les fiches qui ne sont pas des fonds. */
export const isTitresSection = (path: string): boolean => path === "/" || (path.startsWith("/offres") && !path.startsWith(FUND_FICHE));

/** Vers quelle liste remonter depuis une fiche, faute de liste mémorisée. */
export const listForFiche = (path: string): string => (path.startsWith(FUND_FICHE) ? "/fonds" : "/");
