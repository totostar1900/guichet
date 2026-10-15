import { DeskNav } from "@/components/DeskNav";
import { IndiceBody } from "@/app/indice/IndiceBody";
import { SanteIndice } from "@/components/desk/SanteIndice";
import { requireDesk } from "@/lib/auth";
import { indexPageData } from "@/lib/market/index-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "L'indice" };

/**
 * L'indice, lu du desk : la page du Guichet, par le même composant.
 *
 * Elle vit à côté des notes plutôt qu'à leur place : « /desk/indice » est
 * l'atelier des notes, celle-ci est ce que le client voit de l'indice.
 *
 * ET CE QUE LE CLIENT NE VOIT PAS : le panneau de santé, rendu ici et non
 * dans le corps partagé. Un composant du desk ne s'importe pas depuis une
 * page du Guichet, et le corps en est une. Les six mesures qu'il porte se
 * commentent : « un émetteur pèse 73 % » est une mise en garde pour qui
 * conseille, et une phrase inquiétante pour qui lit seul.
 */
export default async function DeskIndicePage({ searchParams }: { searchParams: Promise<{ toutes?: string; societe?: string; page?: string }> }) {
  await requireDesk("/desk/indice/apercu");
  const data = await indexPageData();
  return (
    <>
      <DeskNav current="/desk/indice/apercu" />
      <IndiceBody searchParams={searchParams} mode="desk" />
      <div className="page">
        <SanteIndice
          points={data.stats.points}
          poids={data.weights.map((w) => ({ mnemo: w.mnemo, close: w.close, capTotal: w.capTotal, capFloat: w.capFloat, lastDividend: w.lastDividend }))}
          /* LE MNEMO VOYAGE AVEC L HISTORIQUE : sans lui, le betâ n a pas de nom
             et deux dividendes de societes differentes se confondent. */
          histoires={data.histories.map(({ w, quotes }) => ({ mnemo: w.mnemo, quotes }))}
        />
      </div>
    </>
  );
}
