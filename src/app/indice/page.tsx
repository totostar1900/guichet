import { IndiceBody } from "./IndiceBody";
import { Glissement } from "@/components/mobile/Glissement";

export const dynamic = "force-dynamic";
export const metadata = { title: "L'indice BVMAC All Share" };

export default async function IndicePage({ searchParams }: { searchParams: Promise<{ toutes?: string; societe?: string; page?: string }> }) {
  return (
    <Glissement>
      <>
        <IndiceBody searchParams={searchParams} />
      </>
    </Glissement>
  );
}
