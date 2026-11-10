import { redirect } from "next/navigation";

/** L'ancienne adresse de la page Activité (10 novembre 2026) : elle renvoie à « /activite », pour les liens et les favoris déjà enregistrés. */
export default function TraderPage() {
  redirect("/activite");
}
