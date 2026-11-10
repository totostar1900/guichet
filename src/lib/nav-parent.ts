/**
 * LE RETOUR D'UNE PAGE DE L'ACTIVITÉ EST SON ÉTAPE PRÉCÉDENTE, PAS LA DERNIÈRE PAGE VUE (10 novembre 2026).
 *
 * La flèche de la barre du haut reculait dans l'historique : après un parcours (Activité, Ma provision, Approvisionner, Par virement), elle repassait par chaque page visitée. Pour les pages de l'Activité elle remonte maintenant d'un cran de l'arbre : la confirmation
 * revient aux coordonnées, les coordonnées au choix, le choix à la provision, la provision à l'Activité — et l'Activité est une racine, où le menu de base est de nouveau là. Quelques retours suffisent, quel que soit le chemin pris.
 *
 * Une page qui n'est pas de l'Activité (une fiche, un éclairage…) garde le retour d'avant : l'historique, avec sa liste, ses filtres et son défilement.
 */
const FAMILLE = ["argent", "regles", "provision", "prelevements", "epargne", "ordres", "reinvestir", "performance", "documents", "profil", "compte", "securite"];
/** Les trois pages où se gère une règle automatique : on y vient de « Mon argent » ou de « Ce qui part tout seul ». */
const REGLES = ["prelevements", "epargne", "reinvestir"];

export function parentDe(chemin: string, venuDe?: string | null): string | undefined {
  const p = chemin.split("?")[0].replace(/(.)\/$/, "$1");
  const seg = p.split("/").filter(Boolean);
  if (seg[0] !== "moi" || !FAMILLE.includes(seg[1] ?? "")) return undefined;
  /* Une page de règle s'ouvre de « Mon argent », de « Ce qui part tout seul » ou, pour le prélèvement, du choix d'approvisionnement : on retourne d'où l'on vient, parmi ceux-là. */
  if (seg.length === 2 && REGLES.includes(seg[1])) {
    if (p === "/moi/prelevements" && venuDe?.startsWith("/moi/provision/alimenter")) return "/moi/provision/alimenter";
    return venuDe === "/moi/regles" ? "/moi/regles" : "/moi/argent";
  }
  if (seg.length === 2) return "/activite";
  return `/${seg.slice(0, -1).join("/")}`;
}
