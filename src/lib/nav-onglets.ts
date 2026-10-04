import { currentMarketPage } from "./market/pages";
import { INSTRUMENTS_PAGES, MARCHE_PAGES, type NavPage } from "./nav-groups";
import { isFundsSection, isInstrumentsSection, isTitresSection } from "./nav-section";

/**
 * LA RANGÉE EST CELLE DU SIÈGE, ET D'UN SEUL.
 *
 * Elle portait « Vue d'ensemble · Titres · Fonds · Adjudications · Indice »
 * sous l'étiquette « les pages du marché ». Or le dock sépare depuis deux
 * sièges, Marché se lit et Instruments s'achète, et cette rangée enjambait les
 * deux : debout sur « /marche » le dock allumait MARCHÉ, un toucher sur
 * « Titres » dans la MÊME rangée et il allumait INSTRUMENTS. On n'avait pas
 * changé de barre, on avait changé de section, et la rangée, toujours là,
 * laissait croire le contraire.
 *
 * Elle était le reste de l'organisation d'avant, quand Marché portait les
 * deux ; la séparation a été décidée dans « nav-section » et la rangée ne l'a
 * jamais suivie. Deux autres défauts tombent avec : elle n'existait que sur
 * quatre des neuf pages de la famille, et son dernier onglet, l'indice, menait
 * à une page qui ne la portait pas, donc hors d'elle-même, le retour se
 * faisant par le dock en deux touchers. Mesuré le 5 octobre 2026.
 *
 * ELLE NE TIENT PLUS SA LISTE. Les pages de chaque siège sont déclarées une
 * fois, dans « nav-groups », et la feuille du dock les lit déjà : deux listes
 * de la même chose divergent toujours, et c'est la leçon que ce fichier-là
 * porte depuis « Mes documents », qui a existé une journée sans qu'aucun menu
 * n'y mène.
 *
 * LA LEÇON N'EST PAS UN ONGLET. Elle vit sous « /info », donc hors des deux
 * sièges : en faire un onglet donnerait une pastille qui ne s'allume jamais.
 * Elle reste dans la feuille du dock et au pied des articles.
 *
 * TITRES ET FONDS NE FUSIONNENT PAS, ILS SE RANGENT. Les mettre dans une même
 * liste serait l'erreur inverse : un fonds ne se lit pas comme une ligne. Sa
 * valeur liquidative porte une date, ses frais comptent, il n'a ni coupon ni
 * échéance, donc les colonnes ne sont pas les mêmes et la table ne peut pas
 * l'être. Ils partagent un siège et gardent chacun leur page.
 *
 * La décision vit ici, hors du composant, pour qu'un cliquet puisse la lire
 * sans monter un rendu.
 */
export const ongletsDuSiege = (path: string): NavPage[] => (isInstrumentsSection(path) ? INSTRUMENTS_PAGES : MARCHE_PAGES.filter((p) => !p.guide));

/**
 * Où l'on est, pour les onglets dont l'adresse ne suffit pas à le dire.
 *
 * Un préfixe ne tranche pas : « /indice » est celui de « /indice/notes », donc
 * l'indice s'allumerait sur les notes, et « /societes » ne couvre pas
 * « /emetteurs », qui est pourtant la même page. Du côté de la lecture c'est
 * « currentMarketPage » qui le sait déjà, et du côté de l'achat une fiche vit
 * sous « /offres » où seul le préfixe « fund- » dit s'il s'agit d'un fonds :
 * c'est « nav-section » qui tranche. Les deux barres ne peuvent donc pas en
 * tenir deux versions.
 */
export const estIci = (p: NavPage, path: string): boolean => {
  if (p.key === "titres") return isTitresSection(path);
  if (p.key === "fonds") return isFundsSection(path);
  if (isInstrumentsSection(path)) return path.startsWith(p.href);
  return currentMarketPage(path) === p.key;
};
