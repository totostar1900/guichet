import { OngletsMarche } from "@/components/market/OngletsMarche";
import { IndiceBody } from "./IndiceBody";

export const dynamic = "force-dynamic";
export const metadata = { title: "L'indice BVMAC All Share" };

export default async function IndicePage({ searchParams }: { searchParams: Promise<{ toutes?: string; societe?: string; page?: string }> }) {
  return (
    <>
      {/* La rangee du siege « Marche », sur toutes ses pages : sans elle,
          cette page etait une impasse dont on ne sortait que par le dock. */}
      <OngletsMarche />
      <IndiceBody searchParams={searchParams} />
    </>
  );
}
