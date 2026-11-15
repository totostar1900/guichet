import { redirect } from "next/navigation";

/** La liste vit sur la page de l'épargne depuis le 15 novembre 2026 : l'ancienne adresse y renvoie. */
export default function EnPlacePage() {
  redirect("/moi/epargne");
}
