import type { ClientFile } from "@/lib/domain/kyc";

/**
 * La file de travail des dossiers.
 *
 * La colonne de gauche montrait tous les dossiers, sans recherche ni limite.
 * À trois cents, elle ne se lit plus : les urgents se perdent au milieu, et la
 * page rend trois cents cartes pour en servir deux. Le fond du problème est
 * qu'elle faisait deux métiers à la fois, une file et un annuaire, qui veulent
 * l'inverse l'un de l'autre : une file doit être courte et diminuer à mesure
 * qu'on travaille, un annuaire doit être complet et se chercher.
 *
 * L'annuaire est parti au Répertoire. Reste la file : ce qui n'est pas réglé.
 * « Compléments » y figure même si la balle est dans le camp du client, parce
 * qu'un dossier en attente de pièces est un dossier qu'on relance, pas un
 * dossier fini.
 */
export const waiting = (f: ClientFile): boolean => f.status === "soumis" || f.status === "en_revue" || f.status === "complements";

const hay = (f: ClientFile) => [f.identity.name, f.identity.email, f.identity.phone, f.identity.city].map((v) => (v ?? "").toLowerCase());

/**
 * Ce que la colonne montre.
 *
 * En recherche, tout ce qui répond, quel que soit l'état : on cherche un nom
 * précisément parce qu'il n'est pas sous les yeux.
 *
 * Sinon, ce qui attend, plus le dossier ouvert même s'il n'attend rien. Sans
 * cette exception, arriver du Répertoire sur un dossier approuvé l'afficherait
 * à droite avec une colonne vide à gauche, et on ne saurait plus où l'on est.
 */
export function fileQueue(files: ClientFile[], selectedId?: string, query = ""): ClientFile[] {
  const q = query.trim().toLowerCase();
  if (q) return files.filter((f) => hay(f).some((v) => v.includes(q)));
  return files.filter((f) => waiting(f) || f.id === selectedId);
}
