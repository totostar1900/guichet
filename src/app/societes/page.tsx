import { OngletsMarche } from "@/components/market/OngletsMarche";
import { SocietesBody } from "./SocietesBody";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sociétés cotées : BVMAC") };
}

export default async function SocietesPage() {
  return (
    <>
      {/* La rangee du siege « Marche », sur toutes ses pages : sans elle,
          cette page etait une impasse dont on ne sortait que par le dock. */}
      <OngletsMarche />
      <SocietesBody />
    </>
  );
}
