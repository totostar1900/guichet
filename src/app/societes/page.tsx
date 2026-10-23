import { SocietesBody } from "./SocietesBody";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sociétés cotées : BVMAC") };
}

export default async function SocietesPage() {
  return (
    <Glissement>
      <>
        <SocietesBody />
      </>
    </Glissement>
  );
}
