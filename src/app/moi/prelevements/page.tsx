import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { lireLesMandats } from "./donnees";

/**
 * LE SOMMAIRE DES PRÉLÈVEMENTS N'EXISTE PLUS (16 novembre 2026, planche « Mon argent », 3A et 7) : le mandat d'une épargne est une étape de l'épargne, celui de la provision est
 * « Verser chaque mois ». Chaque mandat vit dans « Ce qui part tout seul », sur « Mon argent », et garde sa page.
 *
 * Les anciennes adresses restent valables : « ?instruction= » mène au mandat de cette épargne, « ?de=argent » à la mise en place d'une provision, le reste à la section.
 */
export default async function PrelevementsPage({ searchParams }: { searchParams: Promise<{ instruction?: string; de?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession("/moi/prelevements");
  const { mandats, provisionLibre } = await lireLesMandats(s.userId);
  const demande = sp.instruction ? mandats.find((m) => m.standingId === sp.instruction && m.state !== "revoque") : undefined;
  if (demande) redirect(`/moi/prelevements/${demande.id}`);
  if ((sp.de === "argent" || sp.de === "alimenter") && provisionLibre) redirect("/moi/prelevements/nouveau");
  redirect("/moi/argent#en-place");
}
