/**
 * LE REGISTRE DE L'ESPACE : QUELLE PAGE LIT LE JETON, QUELLE PAGE NE LE LIT PAS ENCORE.
 *
 * Une seule liste, lue par « etalon.test » et par « espace-page.test ». Elle
 * est la mémoire de la migration décrite à ETALON.md § 8.5 : une page y entre
 * quand elle a été mesurée au navigateur à 390 px et que tous les écarts d'un
 * niveau valent le jeton ; elle sort de « A_CONVERTIR » le même jour.
 */

/** [feuille, classe du conteneur] — le conteneur lit `--sections-gap` et pose `--entete-marge: 0px`. */
export const CONVERTIES: [string, string][] = [
  ["src/app/trader/page.module.css", "page"],
  ["src/app/moi/reinvestir/page.module.css", "page"],
  ["src/app/moi/epargne/page.module.css", "page"],
  ["src/app/moi/documents/page.module.css", "page"],
  ["src/components/Feuillet.module.css", "page"],
  ["src/app/Console.module.css", "page"],
  ["src/app/calendrier/page.module.css", "page"],
  ["src/app/sondage/page.module.css", "page"],
  ["src/app/moi/performance/page.module.css", "page"],
  ["src/app/moi/provision/page.module.css", "wrap"],
  ["src/app/moi/tarifs/page.module.css", "page"],
  ["src/app/moi/prelevements/page.module.css", "wrap"],
  ["src/app/moi/textes/page.module.css", "page"],
  ["src/app/moi/securite/page.module.css", "wrap"],
  ["src/app/moi/profil/page.module.css", "wrap"],
  ["src/app/moi/reclamation/page.module.css", "wrap"],
  ["src/app/info/risques/page.module.css", "page"],
  ["src/app/info/mentions/page.module.css", "wrap"],
  ["src/app/actualites/page.module.css", "page"],
  ["src/app/info/aide/aide.module.css", "wrap"],
];

/** Converties par la classe globale « pile » (aucune règle de module à lire) : le fichier de la page DOIT la porter. */
export const PAR_LA_PILE = ["src/app/marche/page.tsx", "src/app/titres/page.tsx", "src/app/fonds/page.tsx", "src/app/indice/IndiceBody.tsx", "src/app/societes/SocietesBody.tsx", "src/app/actualites/page.tsx", "src/app/info/aide/page.tsx", "src/app/info/eclairages/page.tsx", "src/app/info/glossaire/page.tsx", "src/app/info/simulateur/page.tsx"];

/**
 * Feuilles de page qui ÉCRIVENT ENCORE leur écart (un « gap » qui n'est pas le jeton).
 * Chaque entrée sera retirée par la conversion de la page ; la clause tombe si on l'oublie.
 */
export const A_CONVERTIR: [string, string][] = [
  ["src/app/info/parcours/page.module.css", "wrap"],
  ["src/app/moi/documents/[id]/page.module.css", "wrap"],
  ["src/app/moi/ordres/[id]/page.module.css", "wrap"],
  ["src/app/offres/[id]/intention/page.module.css", "page"],
  ["src/app/offres/[id]/page.module.css", "page"],
  ["src/app/ouvrir-un-compte/convention/page.module.css", "page"],
];

/** La vitrine garde son pas (ETALON.md § C). */
export const VITRINE: [string, string][] = [
  ["src/app/a-propos/page.module.css", "page"],
  ["src/app/placements/page.module.css", "page"],
];
