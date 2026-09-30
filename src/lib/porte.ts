/**
 * Ce qui se lit sans compte, et ce qui demande d'entrer.
 *
 * La plateforme se referme : chaque chiffre, chaque instrument, la courbe,
 * l'indice, le calendrier, le portefeuille et toute transaction demandent une
 * connexion, comme sur toute plateforme de marché moderne. Il reste devant la
 * porte une colonne vertébrale mince, et elle est choisie, pas subie.
 *
 * LA LISTE EST BLANCHE, ET C'EST VOULU. Une liste noire laisse passer toute
 * page nouvelle par omission ; une liste blanche la ferme par défaut, et
 * l'ouvrir demande de l'écrire ici. Une adresse oubliée coûte une gêne, une
 * adresse ouverte par mégarde coûte la décision de la maison.
 *
 * Ce qui reste public, et pourquoi :
 *
 * - « / » : l'accueil, qui présente la maison sans montrer un seul chiffre.
 * - « /info » : le guide, le glossaire, l'aide, les mentions. C'est de
 *   l'éducation et c'est la crédibilité de la maison, pas le produit.
 * - les notes de marché publiées : ce sont des publications, avec leur
 *   référence et leur date. Une publication qu'on ne peut pas citer n'en est
 *   pas une.
 * - la fiche d'une ligne, en aperçu : un lien partagé par WhatsApp doit
 *   continuer de travailler. La page rend alors l'émetteur, la nature et
 *   l'échéance, et retient le prix, le rendement et l'échéancier.
 * - la connexion, l'ouverture de compte, le désabonnement, et les routes
 *   techniques, qui portent leur propre garde.
 */

/** Les adresses exactes qui répondent à tout le monde. */
const EXACTES = new Set(["/", "/connexion", "/ouvrir-un-compte", "/ne-plus-recevoir", "/robots.txt", "/manifest.webmanifest", "/sitemap.xml", "/favicon.ico"]);

/**
 * Les branches entières qui répondent à tout le monde.
 *
 * CHACUNE FINIT PAR UNE BARRE, et ce n'est pas une coquetterie : « /info »
 * sans barre ouvrait « /informations-financieres » par simple préfixe. La
 * racine de la branche est reconnue à part, la barre retirée.
 */
const BRANCHES = [
  "/info/", // guide, glossaire, aide, mentions, parcours, risques
  "/connexion/", // le second facteur
  "/auth/", // le retour d'un lien de connexion ou d'une porte Google
  "/api/", // crons, entrants, notifications : chacune porte sa propre garde
  "/_next/",
  "/icons/",
];

/** Les notes de marché publiées, page et PDF, et l'archive qui les liste. */
const NOTES = /^\/indice\/notes?(\/|$)/;

/**
 * La fiche d'une ligne, et seulement elle : « /offres/<id> » et son image de
 * partage. Ce qui pend dessous (« /intention », « /fiche », « /doc/1 ») porte
 * des chiffres ou engage, et se referme.
 */
const FICHE = /^\/offres\/[^/]+(\/opengraph-image)?$/;

/** Cette adresse se lit-elle sans compte ? */
export const estPublic = (path: string): boolean => {
  const p = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (EXACTES.has(p)) return true;
  if (BRANCHES.some((b) => p === b.slice(0, -1) || p.startsWith(b))) return true;
  if (NOTES.test(p)) return true;
  return FICHE.test(p);
};
