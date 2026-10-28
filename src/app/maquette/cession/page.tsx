import { notFound } from "next/navigation";
import { Glissement } from "@/components/mobile/Glissement";
import { repo } from "@/lib/data";
import { MaquetteCession } from "./MaquetteCession";

export const metadata = { title: "Maquette · céder des titres" };

/**
 * LA QUATRIÈME MAQUETTE : CELLE OÙ L'ON PART DE CE QU'ON A.
 *
 * Les trois premières partent d'une somme qu'on décide — on choisit de placer
 * un million, de proposer un taux, de verser cinquante mille chaque mois. La
 * cession part de l'autre bout : on détient cent vingt titres, et la seule
 * question est combien on en lâche. Le chiffre a donc un PLAFOND, qui n'est
 * pas une règle de la maison mais ce que le client possède, et la conséquence
 * qui compte n'est pas « ce que vous obtenez » mais « ce qu'il vous restera ».
 *
 * Elle emprunte tout le reste aux autres — c'est la demande du jour :
 * « harmoniser, ne pas refaire une présentation à chaque fois ».
 */
export default async function MaquetteCessionPage() {
  const offres = await repo().listOffers();
  const o = offres.find((x) => x.kind === "MARCHE" && x.lastPrice) ?? offres[0];
  if (!o) notFound();
  return (
    <Glissement>
      <MaquetteCession titre={o.title} isin={o.isin} cours={o.lastPrice ?? 0} detenu={120} />
    </Glissement>
  );
}
