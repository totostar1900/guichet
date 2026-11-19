import { redirect, RedirectType } from "next/navigation";

/** « Préférences » a rejoint « Paramètres » (19 novembre 2026, planche « Paramètres et connexion », 1A) : l'ancienne adresse reste valable. */
export default function AppareilPage() {
  redirect("/parametres", RedirectType.replace);
}
