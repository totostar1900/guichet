import { requireDesk } from "@/lib/auth";
import { modeleDeChargement } from "@/lib/chargement-classeur";
import { emetteursDuRegistre } from "@/lib/chargement-plan";

export const dynamic = "force-dynamic";

/**
 * LE MODÈLE DE CHARGEMENT, FABRIQUÉ À LA DEMANDE (20 novembre 2026) : les listes déroulantes (émetteurs) sont celles du registre au moment du téléchargement. Réservé au desk.
 */
export async function GET() {
  await requireDesk("/desk/a-valider");
  const octets = await modeleDeChargement(await emetteursDuRegistre());
  return new Response(octets as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="modele-chargement-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
