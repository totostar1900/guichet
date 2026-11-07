import { DeskNav } from "@/components/DeskNav";
import { ComparerBody, type ParamsComparer } from "@/app/comparer/ComparerBody";
import { requireDesk } from "@/lib/auth";
import { isResponsable } from "@/lib/auth/types";
import { loadTauxBancaire } from "@/lib/policy";
import { TauxBancaireForm } from "./TauxBancaireForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comparer" };

/** La comparaison du Guichet, lue du desk : le même composant, les liens en moins. */
export default async function DeskComparerPage({ searchParams }: { searchParams: Promise<ParamsComparer> }) {
  const me = await requireDesk("/desk/comparer");
  const taux = await loadTauxBancaire();
  return (
    <>
      <DeskNav current="/desk/comparer" />
      <TauxBancaireForm pct={taux?.pct} on={taux?.on} peutFixer={isResponsable(me)} />
      <ComparerBody searchParams={searchParams} mode="desk" />
    </>
  );
}
