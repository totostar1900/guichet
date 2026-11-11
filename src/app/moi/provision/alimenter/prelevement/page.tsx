import { redirect } from "next/navigation";

/** L'étape « par prélèvement » n'existe plus (10 novembre 2026) : l'adresse renvoie au formulaire « Autoriser un prélèvement ». */
export default function PrelevementPage() {
  redirect("/moi/prelevements?de=argent");
}
