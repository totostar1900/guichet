import { MARKET_PAGES, type MarketPage } from "./market/pages";

/**
 * LES PAGES DE CHAQUE SIÈGE, DÉCLARÉES UNE FOIS.
 *
 * La bande de l'écran large et le dock du téléphone tenaient chacun leur
 * liste. Deux listes de la même chose divergent toujours, et c'est ainsi que
 * « Mes documents » a existé pendant une journée sans qu'aucun menu n'y mène.
 *
 * Un siège ne mène plus à une page : il ouvre sa liste, et l'ancienne racine
 * en est le premier élément. Un siège qui est à la fois un lien et un bouton
 * demande au lecteur de viser, et il vise mal : le nom ouvrait une page, le
 * chevron ouvrait la liste, et deux cibles de huit pixels se touchent.
 */
/* « guide » entre dans la part partagee : la rangee d onglets s en sert pour
   ecarter la lecon, qui vit sous « /info » et dont la pastille ne
   s allumerait jamais. */
export type NavPage = Pick<MarketPage, "key" | "href" | "label" | "hint" | "short" | "tuile" | "guide">;

/**
 * Ce que je possède, et ce qui en découle. Le tableau de bord ouvre la liste
 * parce qu'il EST l'ancienne racine : la déplacer sans la nommer l'aurait
 * rendue introuvable.
 */
export const PORTEFEUILLE_PAGES: NavPage[] = [
  { key: "bord", href: "/", label: "Tableau de bord", tuile: "ce qui vous attend", hint: "ce que vous avez, ce qui vous attend, et ce qui est entré" },
  { key: "performance", href: "/moi/performance", label: "Analyse", tuile: "répartition et rendement", hint: "la répartition, le rendement, l'échéancier et vos opérations" },
  { key: "reinvestir", href: "/moi/reinvestir", label: "Réinvestir", tuile: "un coupon qui tombe", hint: "où remettre un coupon ou un remboursement qui vient de tomber" },
  { key: "documents", href: "/moi/documents", label: "Mes documents", tuile: "relevés, avis, bulletins", hint: "vos relevés, vos avis d'opéré, vos bulletins et vos appels de fonds" },
];

/**
 * Ce qui s'achète. Les trois façons d'entrer sur une ligne, et rien d'autre :
 * une leçon sur l'indice n'est pas un instrument, et une séance annoncée en
 * est un.
 */
export const INSTRUMENTS_PAGES: NavPage[] = [
  { key: "titres", href: "/titres", label: "Titres", tuile: "obligations, bons, actions", hint: "obligations, bons du Trésor et actions de la zone CEMAC" },
  { key: "fonds", href: "/fonds", label: "Fonds", tuile: "les OPCVM de la zone", hint: "les OPCVM de la zone, leur valeur liquidative et leurs frais" },
  { key: "calendrier", href: "/calendrier", label: "Adjudications", tuile: "les séances des Trésors", hint: "les séances des six Trésors, annoncées environ une semaine avant" },
];

/** Ce qui se lit : l'indice, les sociétés, les notes, les actualités. */
export const MARCHE_PAGES: NavPage[] = MARKET_PAGES;
