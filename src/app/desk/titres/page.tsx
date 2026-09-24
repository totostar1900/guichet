import { DeskNav } from "@/components/DeskNav";
import { DeskView } from "@/components/DeskView";
import { TitresBody } from "@/app/TitresBody";
import { requireDesk } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Titres" };

/**
 * Les titres, lus du desk : la liste du Guichet, par le même composant.
 *
 * Une rangée mène à la ligne au desk, qui porte cette lecture plus les
 * versions, le cycle de vie et la piste d'audit. Le « ··· » du client, la
 * densité des cartes et la visite guidée ne paraissent pas : le desk lit, il
 * n'agit pas d'ici.
 */
export default async function DeskTitresPage() {
  await requireDesk("/desk/titres");
  return (
    <>
      <DeskNav current="/desk/titres" />
      <DeskView>
        <TitresBody />
      </DeskView>
    </>
  );
}
