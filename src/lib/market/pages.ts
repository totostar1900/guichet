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
  /** Le nom en deux mots, pour une pastille : le nom complet n'y tiendrait pas. */
  short?: string;
  /** Vrai quand la page appartient au Guide plutôt qu'au marché lui-même. */
  guide?: boolean;
  /**
   * L'adresse de la même page au desk, quand elle y est servie. Les autres
   * ne paraissent pas dans la bande du desk : les y laisser enverrait le
   * lecteur chez le client, déconnecté, ce que toute la séparation évite.
   */
  deskHref?: string;
}

export const MARKET_PAGES: MarketPage[] = [
  { key: "marche", href: "/marche", label: "Le marché", hint: "la porte de l'environnement BVMAC : l'indice, les sociétés, les notes, les avis" },
  { key: "indice", href: "/indice", deskHref: "/desk/indice/apercu", label: "L'indice BVMAC All Share", short: "L'indice", hint: "le niveau séance par séance, sept vues, la composition sur les deux pondérations" },
  { key: "societes", href: "/societes", deskHref: "/desk/societes", label: "Les sociétés cotées", short: "Les sociétés", hint: "les sept actions de la cote, leur cours, leur poids, leur rendement" },
  { key: "notes", href: "/indice/notes", deskHref: "/desk/indice", label: "Les notes de marché", short: "Les notes", hint: "un trimestre par note : ce qu'il a fait, les sociétés derrière le chiffre" },
  { key: "comparer", href: "/comparer", deskHref: "/desk/comparer", label: "Comparer deux lignes", short: "Comparer", hint: "deux titres côte à côte, avec l'indice en repère" },
  // Le primaire de la zone, qui n'est pas la cote : les six Trésors, et le seul
  // endroit où leurs séances se lisent ensemble.
  { key: "calendrier", href: "/calendrier", label: "Le calendrier des adjudications", short: "Le calendrier", hint: "les séances des six Trésors, annoncées environ une semaine avant" },
  // Le Guide est servi sur les deux domaines : une seule adresse suffit.
  { key: "lecon", href: "/info/indice-bvmac", deskHref: "/info/indice-bvmac", label: "La leçon : comment lire l'indice", short: "La leçon", hint: "ce qu'il dit, ce qu'il ne dit pas, et le curseur à manipuler", guide: true },
  // cinq rubriques, pas seulement la BVMAC : Trésors, BVMAC, Sociétés, Fonds, Réglementation
  { key: "actualites", href: "/actualites", label: "Actualités du marché", short: "Actualités", hint: "Trésors, BVMAC, sociétés, fonds, réglementation : ce que le desk a relu et publié" },
];

/**
 * Le chemin d'une page, ramené à la page de la famille dont elle relève.
 *
 * Trois endroits décidaient séparément qu'une URL appartient au marché :
 * l'onglet d'ordinateur, la barre du téléphone, et rien du tout pour le
 * bandeau. Trois listes de préfixes à tenir à jour, donc deux qui dérivent.
 * Celle-ci est la seule.
 */
export function currentMarketPage(path: string): string | undefined {
  if (path.startsWith("/indice/note")) return "notes";
  if (path.startsWith("/indice")) return "indice";
  if (path.startsWith("/societes") || path.startsWith("/emetteurs")) return "societes";
  if (path.startsWith("/comparer")) return "comparer";
  if (path.startsWith("/calendrier")) return "calendrier";
  if (path.startsWith("/info/indice-bvmac")) return "lecon";
  if (path.startsWith("/actualites")) return "actualites";
  if (path.startsWith("/marche")) return "marche";
  return undefined;
}

/** Vrai quand la page ouverte appartient au marché BVMAC. */
export const isMarketPath = (path: string): boolean => currentMarketPage(path) !== undefined;

/** La famille, moins la page où l'on est. */
export const marketSiblings = (current?: string): MarketPage[] => MARKET_PAGES.filter((p) => p.key !== current);

/** Les mêmes, vues du desk : celles qui y sont servies, à leur adresse. */
export const deskSiblings = (current?: string): MarketPage[] =>
  marketSiblings(current)
    .filter((p) => p.deskHref)
    .map((p) => ({ ...p, href: p.deskHref! }));
