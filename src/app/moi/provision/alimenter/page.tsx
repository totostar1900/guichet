import { redirect } from "next/navigation";

/**
 * LE CHOIX « VIREMENT OU PRÉLÈVEMENT » N'EXISTE PLUS (10 novembre 2026, audit « Mon argent ») : « Mon argent » porte le même choix, avec l'épargne programmée en plus, et chaque tuile mène droit au formulaire. L'ancienne adresse y renvoie, pour les liens et les favoris déjà enregistrés.
 */
export default function ApprovisionnerPage() {
  redirect("/moi/argent");
}
