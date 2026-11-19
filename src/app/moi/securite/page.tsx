import { redirect, RedirectType } from "next/navigation";

/** « Sécurité et connexion » a rejoint « Paramètres » (19 novembre 2026, planche « Paramètres et connexion », 1A) : l'ancienne adresse reste valable pour les liens déjà envoyés. */
export default function SecurityPage() {
  redirect("/parametres", RedirectType.replace);
}
