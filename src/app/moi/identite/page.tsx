import { redirect } from "next/navigation";

/**
 * « PROFIL ET COORDONNÉES » N'EXISTE PLUS COMME RUBRIQUE (21 novembre 2026, le client : « intégrer les éléments de profil et coordonnées dans mes pièces, ensuite supprimer profil et coordonnées »).
 * L'identité et les deux canaux prouvés vivent sur « Mes pièces ». L'ancienne adresse y mène.
 */
export default function IdentitePage() {
  redirect("/ouvrir-un-compte#profil-et-coordonnees");
}
