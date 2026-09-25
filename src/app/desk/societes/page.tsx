import { DeskNav } from "@/components/DeskNav";
import { DeskView } from "@/components/DeskView";
import { SocietesBody } from "@/app/societes/SocietesBody";
import { requireDesk } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sociétés" };

/** Les sociétés cotées, lues du desk : la liste du Guichet, par le même composant. */
export default async function DeskSocietesPage() {
  await requireDesk("/desk/societes");
  return (
    <>
      <DeskNav current="/desk/societes" />
      <DeskView>
        <SocietesBody mode="desk" />
      </DeskView>
    </>
  );
}
