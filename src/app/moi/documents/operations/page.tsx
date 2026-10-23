import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Operations } from "../Operations";
import { chargerLesRayons } from "../rayons";
import { Rayon, titreDuRayon } from "../Rayon";

export const dynamic = "force-dynamic";
export const generateMetadata = () => titreDuRayon("operations");

/** Ce qu'un ordre a produit : la bascule « par opération / par date » vit ici, le seul rayon où elle a un sens. */
export default async function OperationsPage() {
  const t = await getT();
  const s = await requireSession("/moi/documents/operations");
  const { desOperations, ops } = await chargerLesRayons(s.userId, t);
  return (
    <Rayon cle="operations">
      <Operations docs={desOperations} ops={ops} />
    </Rayon>
  );
}
