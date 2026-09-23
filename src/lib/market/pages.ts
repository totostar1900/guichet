/**
 * Les pages qui parlent du marché BVMAC, déclarées une fois.
 *
 * Chaque page de la famille pose la même bande « Sur le même sujet » au pied
 * de son article, tirée d'ici, la page courante retirée. Une seule table,
 * parce que des liens écrits à la main dérivent : c'est ainsi que la page de
 * l'indice s'est retrouvée sans rien qui pointe vers elle.
 *
 * Ce qui entre ici : une destination stable de la famille. Ce qui n'y entre
 * pas : un lien que telle page cite en passant, qui reste dans la phrase où
 * elle dit pourquoi on le suivrait.
 */
export interface MarketPage {
  key: string;
  href: string;
  label: string;
  /** Ce qu'on y trouve, en une ligne : la bande la montre au survol. */
  hint: string;
  /** Vrai quand la page appartient au Guide plutôt qu'au marché lui-même. */
  guide?: boolean;
}

export const MARKET_PAGES: MarketPage[] = [
  { key: "marche", href: "/marche", label: "Le marché", hint: "la porte de l'environnement BVMAC : l'indice, les sociétés, les notes, les avis" },
  { key: "indice", href: "/indice", label: "L'indice BVMAC All Share", hint: "le niveau séance par séance, sept vues, la composition sur les deux pondérations" },
  { key: "societes", href: "/societes", label: "Les sociétés cotées", hint: "les sept actions de la cote, leur cours, leur poids, leur rendement" },
  { key: "notes", href: "/indice#notes", label: "Les notes de marché", hint: "un trimestre par note : ce qu'il a fait, les sociétés derrière le chiffre" },
  { key: "comparer", href: "/comparer", label: "Comparer deux lignes", hint: "deux titres côte à côte, avec l'indice en repère" },
  { key: "lecon", href: "/info/indice-bvmac", label: "La leçon : comment lire l'indice", hint: "ce qu'il dit, ce qu'il ne dit pas, et le curseur à manipuler", guide: true },
  { key: "actualites", href: "/actualites", label: "Les avis de la Bourse", hint: "ce que la BVMAC publie hors bulletin, quand nous l'avons relu" },
];

/** La famille, moins la page où l'on est. */
export const marketSiblings = (current?: string): MarketPage[] => MARKET_PAGES.filter((p) => p.key !== current);
