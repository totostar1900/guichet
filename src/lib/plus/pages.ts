/**
 * LES RUBRIQUES DE L'ACTIVITÉ, DÉCLARÉES UNE FOIS (9 novembre 2026, reprise le 10).
 *
 * Elles venaient du menu « Plus » de l'Accueil, retiré. La page Activité les lit ici. « Mon argent » (ce que l'on peut faire) et « Ce qui part tout seul » (ce qui est en place) remplacent « Mes versements », « Mes prélèvements » et « Mes coupons à réinvestir », dont les pages restent
 * comme destinations de gestion.
 */
export interface PagePlus {
  cle: "ordres" | "sondages" | "argent" | "regles" | "rentabilite" | "provision" | "documents";
  href: string;
  mot: string;
}

export const PLUS_PAGES: PagePlus[] = [
  { cle: "ordres", href: "/moi/ordres", mot: "Mes ordres et intentions" },
  { cle: "sondages", href: "/sondage", mot: "Mes sondages" },
  { cle: "argent", href: "/moi/argent", mot: "Mon argent" },
  { cle: "regles", href: "/moi/regles", mot: "Ce qui part tout seul" },
  { cle: "rentabilite", href: "/moi/performance", mot: "Ma rentabilité" },
  { cle: "provision", href: "/moi/provision", mot: "Ma provision" },
  { cle: "documents", href: "/moi/documents", mot: "Mes documents" },
];
