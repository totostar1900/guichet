import { AIDE_PAGES, COMPTE_PAGES, INSTRUMENTS_PAGES, MARCHE_PAGES, PORTEFEUILLE_PAGES, TRADE_PAGES, type NavPage } from "@/lib/nav-groups";
import { isAideSection, isEspaceSection, isInstrumentsSection, isMarcheSection, isTradeSection, listForFiche } from "@/lib/nav-section";

/**
 * OÙ ON EST : UN SIÈGE, ET LA RUBRIQUE QUAND IL Y EN A UNE.
 *
 * La bande bleue du téléphone dit le LIEU, toujours de la même façon, et
 * jamais le titre de la page (décidé le 31 octobre 2026, sur maquette). Elle
 * répétait le nom du `h1` quand celui-ci était sorti de l'écran et se taisait
 * sinon : un seul mécanisme, mais le client la lisait comme une bande qui
 * change d'avis. Le titre reste dans la page, une fois.
 *
 * LE SIÈGE est celui que le dock allume ; la règle d'appartenance est celle
 * du dock (« nav-section »), pas une seconde copie. LA RUBRIQUE est le nom de
 * la page de ce siège dont l'adresse est le plus long préfixe de celle-ci
 * (« /moi/documents/argent » → « Mes documents »). Sans rubrique connue, la
 * bande ne dit que le siège : mieux vaut un lieu large qu'un lieu inventé.
 *
 * Le COMPTE est un lieu à part : il est ouvert depuis le menu, pas depuis le
 * dock, et ses rubriques (profil, sécurité, paramétrages) ne sont pas ce que
 * le client possède.
 */
export interface Lieu {
  siege: string;
  rubrique?: string;
}

/** Les cinq mots du dock, et « Compte ». Un cliquet les compare à ceux du dock. */
export const SIEGES = { accueil: "Accueil", trade: "Activité", investir: "Investir", marche: "Marché", aide: "Aide", compte: "Compte" } as const;

/** L'adresse de chaque siège : sur elle, la bande ne dit que le siège. */
const RACINES = ["/", "/trader", "/marche", "/aide"];

const plusLong = (path: string, pages: NavPage[]): string | undefined => {
  let meilleur: NavPage | undefined;
  for (const p of pages) {
    const ok = p.href === "/" ? path === "/" : path === p.href || path.startsWith(`${p.href}/`);
    if (ok && (!meilleur || p.href.length > meilleur.href.length)) meilleur = p;
  }
  // LA RACINE EST LE SIÈGE LUI-MÊME : « Trade › Passer un ordre » sur « /trader » redirait, comme « Accueil › Tableau de bord ».
  return meilleur && !RACINES.includes(meilleur.href) ? meilleur.label : undefined;
};

export function lieuDe(brut: string): Lieu | null {
  const path = brut.split("?")[0].split("#")[0] || "/";
  if (path === "/connexion" || path.startsWith("/connexion/")) return null;
  const compte = path === "/moi/compte" || path.startsWith("/moi/compte/") || COMPTE_PAGES.some((p) => path === p.href || path.startsWith(`${p.href}/`));
  if (compte) return { siege: SIEGES.compte, rubrique: path === "/moi/compte" ? undefined : plusLong(path, COMPTE_PAGES) };
  if (isAideSection(path)) return { siege: SIEGES.aide, rubrique: plusLong(path, AIDE_PAGES) };
  /* « INVESTIR » : les trois familles et les fiches qui en viennent. Trade garde sa page (« /trader »). */
  if (isInstrumentsSection(path)) {
    const ref = path.startsWith("/offres/") ? listForFiche(path) : path;
    return { siege: SIEGES.investir, rubrique: plusLong(ref, INSTRUMENTS_PAGES) };
  }
  if (isTradeSection(path)) {
    // Une fiche vit sous « /offres » : sa rubrique est la liste d'où elle vient.
    const ref = path.startsWith("/offres/") ? listForFiche(path) : path;
    return { siege: SIEGES.trade, rubrique: plusLong(ref, TRADE_PAGES) };
  }
  if (isMarcheSection(path)) return { siege: SIEGES.marche, rubrique: plusLong(path, MARCHE_PAGES) };
  if (isEspaceSection(path)) return { siege: SIEGES.accueil, rubrique: plusLong(path, PORTEFEUILLE_PAGES) };
  return null;
}
