import { redirect } from "next/navigation";

/** L'étape « par prélèvement » n'existe plus (10 novembre 2026) : le choix mène droit au formulaire « Autoriser un prélèvement ». L'ancienne adresse y renvoie. */
export default function PrelevementPage() {
  redirect("/moi/prelevements?de=alimenter");
}
