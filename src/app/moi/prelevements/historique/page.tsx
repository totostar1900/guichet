import { redirect } from "next/navigation";

/** L'historique des prélèvements est une puce du journal de l'argent depuis le 16 novembre 2026 : l'ancienne adresse y mène. */
export default function HistoriquePage() {
  redirect("/moi/documents/argent?filtre=prelevements");
}
