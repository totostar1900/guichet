import { redirect } from "next/navigation";

/** « Ce qui part tout seul » est une section de « Mon argent » depuis le 16 novembre 2026 : l'ancienne adresse y mène. */
export default function ReglesPage() {
  redirect("/moi/argent#en-place");
}
