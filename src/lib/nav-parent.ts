/**
 * LE RETOUR D'UNE PAGE DE L'ACTIVITÉ EST SON ÉTAPE PRÉCÉDENTE, PAS LA DERNIÈRE PAGE VUE (10 novembre 2026, audit « Mon argent »).
 *
 * Une page de l'arbre de l'Activité a un parent par défaut et, quand elle a plusieurs portes d'entrée, la liste de celles d'où l'on peut venir : le retour va à la page d'où l'on vient si elle est dans cette liste, sinon au parent par défaut.
 * Quelques retours suffisent ainsi pour retrouver le menu de base, quel que soit le chemin pris, et la flèche du haut et le retour Android disent la même chose (voir « nav-pile » : quand le parent est la page d'avant, la flèche recule dans l'historique au lieu d'ouvrir une page de plus).
 *
 * Une page qui n'est pas de l'Activité (une fiche, un éclairage…) garde le retour d'avant : l'historique, avec sa liste, ses filtres et son défilement.
 */
const FAMILLE = ["argent", "regles", "provision", "prelevements", "epargne", "ordres", "reinvestir", "performance", "documents", "profil", "compte", "securite"];

const ENTREES: Record<string, { defaut: string; ou: string[] }> = {
  "/moi/argent": { defaut: "/activite", ou: [] },
  "/moi/provision/alimenter/virement": { defaut: "/moi/argent", ou: [] },
  "/moi/provision/alimenter/virement/envoye": { defaut: "/moi/provision/alimenter/virement", ou: [] },
  "/moi/provision/reprendre": { defaut: "/moi/argent", ou: ["/activite"] },
  "/moi/provision/placer": { defaut: "/moi/argent", ou: ["/activite"] },
  "/moi/prelevements": { defaut: "/moi/argent", ou: ["/moi/epargne"] },
  "/moi/epargne": { defaut: "/moi/argent", ou: [] },
  "/moi/reinvestir": { defaut: "/moi/argent", ou: [] },
};

const nu = (c: string) => c.split("?")[0].replace(/(.)\/$/, "$1");

export function parentDe(chemin: string, precedent?: string | null): string | undefined {
  const p = nu(chemin);
  const seg = p.split("/").filter(Boolean);
  if (seg[0] !== "moi" || !FAMILLE.includes(seg[1] ?? "")) return undefined;
  /* La page d'un mandat (et sa mise en place) revient à « Mon argent », où vit sa rangée : l'ancien sommaire des prélèvements n'existe plus (16 novembre 2026). */
  if (seg[1] === "prelevements" && seg.length > 2) return "/moi/argent";
  const e = ENTREES[p];
  if (e) {
    const prec = precedent ? nu(precedent) : undefined;
    return prec && e.ou.includes(prec) ? prec : e.defaut;
  }
  if (seg.length === 2) return "/activite";
  return `/${seg.slice(0, -1).join("/")}`;
}
