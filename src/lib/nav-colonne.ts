import { DESK_GROUPS } from "./desk-groupes";
import { AIDE_PAGES, PORTEFEUILLE_PAGES, TRADE_PAGES, type NavPage } from "./nav-groups";
import { MARKET_PAGES } from "./market/pages";

/**
 * LA COLONNE DE GAUCHE, ET LA SEULE TABLE QUI LA DÉCRIT.
 *
 * Elle REPREND les tables qui existent, `DESK_GROUPS` et `nav-groups`, plutôt
 * que d'en poser une troisième. La maison a déjà payé la leçon : deux listes de
 * la même chose divergent toujours, et c'est ainsi que « Mes documents » a
 * existé pendant une journée sans qu'aucun menu n'y mène.
 *
 * CE QUE LA COLONNE RÉPARE, ET QU'UNE BARRE NE POUVAIT PAS. Une barre a un
 * budget de LARGEUR, une colonne un budget de LONGUEUR. Les trente-huit onglets
 * du desk avaient saturé la barre, et cinq pages étaient restées dehors : on
 * n'y arrivait qu'en tapant l'adresse. Mesuré le 19 octobre 2026, vingt-quatre
 * pages fixes n'étaient citées par aucune barre.
 */
export interface GroupeColonne {
  /** L'étiquette du groupe : elle plie et déplie, et porte ce qu'elle cache. */
  label: string;
  items: { href: string; label: string }[];
}

/** Ce qui existait déjà au desk, tel quel : aucune adresse ne bouge. */
export const COLONNE_DESK: GroupeColonne[] = DESK_GROUPS.map((g) => ({
  label: g.label,
  items: g.tabs.map(([href, label]) => ({ href, label })),
}));

const dePages = (pages: NavPage[]) => pages.map((p) => ({ href: p.href, label: p.label }));

/**
 * Le client. Les quatre sièges arrêtés le 1er octobre deviennent quatre
 * groupes, et « Agir » n'en porte qu'un parce qu'il n'ouvrait aucun menu : les
 * neuf services tiennent sur sa page, et c'est leur état qui se lit, pas leur
 * nom.
 */
export const COLONNE_CLIENT: GroupeColonne[] = [
  { label: "Accueil", items: dePages(PORTEFEUILLE_PAGES) },
  /* TRADE A ABSORBÉ « INSTRUMENTS ». Deux groupes se partageaient un sujet :
     les gestes d'un côté, les familles de l'autre, alors que les cinq
     services menaient déjà aux trois familles. Un seul groupe, et l'ordre dit
     la lecture : ce qu'on fait, puis ce sur quoi on le fait. */
  { label: "Trade", items: dePages(TRADE_PAGES) },
  { label: "Marché", items: dePages(MARKET_PAGES) },
  /* Ce qui se lit et ce qui se demande : deux pages sorties du bas de
     « Trade », où l'on ne les trouvait que par accident. */
  { label: "Aide", items: dePages(AIDE_PAGES) },
];

/** Le visiteur : la vitrine, puis ce qu'il peut lire. */
export const COLONNE_VISITEUR: GroupeColonne[] = [
  { label: "La maison", items: [{ href: "/placements", label: "Nos placements" }, { href: "/a-propos", label: "À propos" }] },
  {
    label: "Comprendre",
    items: [
      /* Le visiteur reçoit les deux destinations qui n'ont pas d'autre porte :
         les éclairages et le glossaire. « Le parcours » est déjà plus bas. */
      { href: "/info/eclairages", label: "Éclairages" },
      { href: "/info/glossaire", label: "Glossaire" },
      { href: "/comparer", label: "Comparer" },
      { href: "/indice/notes", label: "Publications" },
      { href: "/info/risques", label: "Risques et limites" },
      /* Trois pages que la barre ne citait pas : on n'y arrivait que par un
         lien du pied de page, c'est-à-dire après avoir descendu la page. */
      { href: "/info/parcours", label: "Le parcours" },
      { href: "/info/aide", label: "Aide" },
      { href: "/info/mentions", label: "Mentions légales" },
    ],
  },
];

/**
 * LES PAGES QUI VEULENT TOUTE LA LAISSE, et où la colonne s'ouvre escamotée.
 *
 * On ne devine pas « large » à la volée : une table à treize colonnes et une
 * page de texte se ressemblent au rendu du serveur. La route le déclare, donc
 * une page nouvelle naît étroite et son auteur choisit.
 *
 * La poignée au bord ramène la colonne, et ce choix-là tient pour la session :
 * un réglage que la page impose à chaque visite est un réglage qui ment.
 */
/*
 * UNE PAGE QUI A DÉJÀ UN RAIL DE SECTIONS N'EST PAS DANS CETTE LISTE, et
 * c'est l'essai qui m'a repris. J'y avais rangé « /desk/analyses » et
 * « /desk/marche » : la colonne s'y escamotait d'office, donc précisément
 * sur les deux pages où l'on voulait voir la colonne À CÔTÉ de leur rail.
 * Le réglage annulait la décision qu'il devait servir.
 *
 * Ces pages restent larges, mais c'est le lecteur qui escamote s'il le veut,
 * et son choix tient pour la session.
 */
export const ROUTES_LARGES: string[] = [
  "/desk/adjudications/tableau",
  "/desk/bulletins",
  "/desk/clients/quantitatif",
  "/desk/dette",
  "/desk/beac",
  "/desk/comparer",
  "/comparer",
  "/titres",
  "/fonds",
];

/** La route demande-t-elle toute la laisse ? Le préfixe suffit : une fiche de bulletin est aussi large que sa liste. */
export const estRouteLarge = (path: string) => ROUTES_LARGES.some((r) => path === r || path.startsWith(`${r}/`));

/**
 * LES PARCOURS FERMÉS ONT VÉCU, et c'est la page de la convention qui les a
 * jugés.
 *
 * La règle disait : une page qui demande une signature ne propose pas douze
 * sorties, on ne met pas l'escalier au milieu du guichet. Quatre adresses
 * perdaient donc leur colonne — le dossier d'ouverture, sa convention, le
 * désabonnement et la déclaration d'intention.
 *
 * Vu sur la production le 22 octobre 2026 : « /ouvrir-un-compte/convention »
 * n'avait AUCUNE sortie, pas même la poignée qui ramène la colonne escamotée.
 * Rien que la flèche du navigateur. Or c'est la page où l'on signe, et donc
 * celle où l'on veut le plus pouvoir aller relire les risques ou les
 * mentions avant de s'engager. Un tunnel qu'on ne peut pas quitter n'est pas
 * un tunnel, c'est une porte fermée à clef — et la retenue qu'on croyait
 * gagner, on la prend sur la confiance.
 *
 * La colonne est donc sur toutes les pages. Qui veut le calme la replie :
 * c'est son geste, pas une décision prise pour lui.
 */

/** Le groupe qui contient cette adresse, pour l'ouvrir d'office : une carte qui cache votre position n'est pas une carte. */
export function groupeDe(groupes: GroupeColonne[], path: string): string | undefined {
  let meilleur: { label: string; n: number } | undefined;
  for (const g of groupes)
    for (const it of g.items) {
      if (path !== it.href && !path.startsWith(`${it.href}/`)) continue;
      /* Le plus long gagne : « /desk » préfixe tout le desk, et désignerait
         « Carnet » depuis n'importe quelle page. */
      if (!meilleur || it.href.length > meilleur.n) meilleur = { label: g.label, n: it.href.length };
    }
  return meilleur?.label;
}

/** L'adresse exacte qui est ouverte, au sens de la colonne. */
export function pageDe(groupes: GroupeColonne[], path: string): string | undefined {
  let meilleur: string | undefined;
  for (const g of groupes)
    for (const it of g.items) {
      if (path !== it.href && !path.startsWith(`${it.href}/`)) continue;
      if (!meilleur || it.href.length > meilleur.length) meilleur = it.href;
    }
  return meilleur;
}
