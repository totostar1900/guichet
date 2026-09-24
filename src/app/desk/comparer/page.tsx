import { DeskNav } from "@/components/DeskNav";
import { ComparerBody } from "@/app/comparer/ComparerBody";
import { requireDesk } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comparer" };

/** La comparaison du Guichet, lue du desk : le même composant, les liens en moins. */
export default async function DeskComparerPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  await requireDesk("/desk/comparer");
  return (
    <>
      <DeskNav current="/desk/comparer" />
      <ComparerBody searchParams={searchParams} mode="desk" />
    </>
  );
}
