import { DeskNav } from "@/components/DeskNav";
import { IndiceBody } from "@/app/indice/IndiceBody";
import { requireDesk } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "L'indice" };

/**
 * L'indice, lu du desk : la page du Guichet, par le même composant.
 *
 * Elle vit à côté des notes plutôt qu'à leur place : « /desk/indice » est
 * l'atelier des notes, celle-ci est ce que le client voit de l'indice.
 */
export default async function DeskIndicePage({ searchParams }: { searchParams: Promise<{ toutes?: string; societe?: string; page?: string }> }) {
  await requireDesk("/desk/indice/apercu");
  return (
    <>
      <DeskNav current="/desk/indice/apercu" />
      <IndiceBody searchParams={searchParams} mode="desk" />
    </>
  );
}
