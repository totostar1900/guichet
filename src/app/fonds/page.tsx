import { FondsBody } from "./FondsBody";
import { OngletsMarche } from "@/components/market/OngletsMarche";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Fonds : OPCVM de la CEMAC") };
}

export default async function FondsPage() {
  return (
    <Glissement>
      <>
        <OngletsMarche />
        <FondsBody />
      </>
    </Glissement>
  );
}
