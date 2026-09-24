import { DeskNav } from "@/components/DeskNav";
import { DeskView } from "@/components/DeskView";
import { FondsBody } from "@/app/fonds/FondsBody";
import { requireDesk } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fonds" };

/**
 * Les fonds, lus du desk.
 *
 * Exactement la liste du Guichet, par le même composant : une correction
 * faite là paraît ici le même jour, et l'inverse. Ce qui change tient en un
 * mot : une rangée mène à la ligne du desk, et le « ··· » du client, la
 * densité des cartes et la visite guidée ne paraissent pas. Le desk ne
 * souscrit pas depuis cette page : il la lit.
 */
export default async function DeskFondsPage() {
  await requireDesk("/desk/fonds");
  return (
    <>
      <DeskNav current="/desk/fonds" />
      <DeskView>
        <FondsBody />
      </DeskView>
    </>
  );
}
