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

/**
 * La racine a changé de sens.
 *
 * « / » était la liste des titres, et c'était le défaut de fond : une
 * plateforme rangée par instrument sert l'acquisition, mais après son premier
 * achat un client pense par intention, et cet axe n'existait nulle part. La
 * racine devient l'accueil, qui présente ou qui accueille selon la session ;
 * la liste garde tout son rôle, à son adresse.
 */
export const TITRES = "/titres";

/** La liste des fonds, et la fiche d'un fonds. */
export const isFundsSection = (path: string): boolean => path.startsWith("/fonds") || path.startsWith(FUND_FICHE);

/** La liste des titres et les fiches qui ne sont pas des fonds. */
export const isTitresSection = (path: string): boolean => path.startsWith(TITRES) || (path.startsWith("/offres") && !path.startsWith(FUND_FICHE));

/**
 * Le siège « Portefeuille » : ce que je possède, et ce qui en découle.
 *
 * La racine en fait partie, parce qu'un client connecté y trouve son
 * portefeuille. Un visiteur n'y voit aucun onglet s'allumer, et c'est juste :
 * il n'a rien à y voir.
 *
 * Il ne prend pas tout ce qui vit sous /moi. Le profil, la sécurité et la
 * réclamation y vivent aussi et disent QUI JE SUIS, pas ce que j'ai : ils
 * appartiennent au compte. La ligne de partage est la possession, jamais le
 * préfixe de l'adresse.
 */
const AU_COMPTE = ["/moi/profil", "/moi/securite", "/moi/reclamation"];
export const isEspaceSection = (path: string): boolean => (path === "/" || path.startsWith("/moi")) && !AU_COMPTE.some((p) => path === p || path.startsWith(p + "/"));

/**
 * La section « Marché », qui a absorbé le catalogue.
 *
 * « Titres » et « Fonds » tenaient deux sièges dans la bande pour deux façons
 * d'acheter au même endroit. Ils sont maintenant deux onglets DE SECTION, sous
 * un seul siège, avec les séances annoncées, l'indice, les sociétés et le
 * calendrier. La règle vit ici pour que la bande de l'écran large et celle du
 * téléphone ne puissent pas en tenir deux versions.
 */
export const isMarcheSection = (path: string): boolean =>
  path.startsWith("/marche") || path.startsWith("/societes") || path.startsWith("/indice") || path.startsWith("/emetteurs") || path.startsWith("/actualites") || path.startsWith("/comparer");

/**
 * LE SIÈGE « INSTRUMENTS » : CE QUI S'ACHÈTE.
 *
 * Marché portait les deux à la fois, ce qui se lit et ce qui se traite. Un
 * siège qui range un indice et un bon du Trésor côte à côte demande au lecteur
 * de distinguer lui-même la lecture de l'achat, et c'est précisément ce qu'une
 * navigation doit faire à sa place.
 *
 * La ligne de partage tient en trois mots : Marché se lit, Instruments
 * s'achète, Trader fait. Les adjudications quittent donc Marché, où elles
 * étaient rangées comme une publication : une séance annoncée est une occasion
 * d'acheter, pas un article.
 */
export const isInstrumentsSection = (path: string): boolean => isTitresSection(path) || isFundsSection(path) || path.startsWith("/calendrier");

/** Vers quelle liste remonter depuis une fiche, faute de liste mémorisée. */
export const listForFiche = (path: string): string => (path.startsWith(FUND_FICHE) ? "/fonds" : TITRES);
