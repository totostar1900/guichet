import { redirect } from "next/navigation";

/** L'explication vit dans le « i » de la page de l'épargne depuis le 15 novembre 2026 : l'ancienne adresse y renvoie. */
export default function FonctionnementPage() {
  redirect("/moi/epargne");
}
