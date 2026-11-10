import { redirect } from "next/navigation";

/** « Mon activité » est devenue la page Activité, onglet de la barre du bas (10 novembre 2026, planche 2A) : l'ancienne adresse y renvoie. */
export default function ActivitePage() {
  redirect("/trader");
}
