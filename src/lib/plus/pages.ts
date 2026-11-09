/**
 * LES ENTRÉES DE « PLUS », DÉCLARÉES UNE FOIS (9 novembre 2026).
 *
 * Le menu ancré de l'Accueil et le bouton flottant des pages qu'il ouvre lisent la même table : une entrée écrite à la main d'un côté finit par manquer de l'autre. Le bouton flottant reprend les éléments de « Plus »
 * pour qu'on passe d'une page à l'autre sans repasser par l'Accueil, comme le bouton des pages du marché le fait pour la famille du marché.
 */
export interface PagePlus {
  cle: "ordres" | "sondages" | "coupons" | "rentabilite" | "provision" | "versements" | "prelevements" | "documents" | "services";
  href: string;
  mot: string;
}

export const PLUS_PAGES: PagePlus[] = [
  { cle: "ordres", href: "/moi/ordres", mot: "Mes ordres et intentions" },
  { cle: "sondages", href: "/sondage", mot: "Mes sondages" },
  { cle: "coupons", href: "/moi/reinvestir", mot: "Mes coupons à réinvestir" },
  { cle: "rentabilite", href: "/moi/performance", mot: "Ma rentabilité" },
  { cle: "provision", href: "/moi/provision", mot: "Ma provision" },
  { cle: "versements", href: "/moi/epargne", mot: "Mes versements" },
  { cle: "prelevements", href: "/moi/prelevements", mot: "Mes prélèvements" },
  { cle: "documents", href: "/moi/documents", mot: "Mes documents" },
  { cle: "services", href: "/trader", mot: "Tous les services" },
];

/** L'entrée de « Plus » que ce chemin ouvre, sous-pages comprises (`/moi/ordres/42` est « Mes ordres et intentions »). Aucune pour une page qui n'en est pas. */
export function pagePlusDe(chemin: string): PagePlus | undefined {
  return PLUS_PAGES.find((p) => chemin === p.href || chemin.startsWith(`${p.href}/`));
}
