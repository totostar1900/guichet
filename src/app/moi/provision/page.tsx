import { redirect } from "next/navigation";

/** « Ma provision » est le haut de « Mon argent » depuis le 16 novembre 2026 : l'ancienne adresse y mène. */
export default function ProvisionPage() {
  redirect("/moi/argent");
}
