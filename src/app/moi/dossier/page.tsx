import { redirect } from "next/navigation";

/**
 * « MON DOSSIER » N'EXISTE PLUS (21 novembre 2026, le client : « sortir mes pièces et mon profil d'investisseur de mon dossier et les remonter dans mon compte »).
 * « Mes pièces » et « Profil d'investisseur » sont deux rubriques du compte ; l'ancienne adresse mène au compte.
 */
export default function DossierPage() {
  redirect("/moi/compte");
}
