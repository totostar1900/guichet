import { notFound } from "next/navigation";
import { Glissement } from "@/components/mobile/Glissement";
import { repo } from "@/lib/data";
import { MaquetteEpargne } from "./MaquetteEpargne";

export const metadata = { title: "Maquette · épargne programmée" };

/**
 * LA TROISIÈME MAQUETTE : CELLE OÙ L'ON CHOISIT UNE DATE.
 *
 * Des quatre natures de saisie listées le 28 octobre 2026 — montant, taux,
 * dates, prix — deux sont réglées : le montant (première maquette) et le taux
 * (deuxième). Le prix se saisit dans la même boîte que le montant, avec un
 * repère de marché comme le taux : il n'apporte pas de question neuve.
 *
 * LA DATE, SI. Elle est la seule des quatre qui ne soit pas un nombre qu'on
 * tape : c'est un choix dans un calendrier, et sur un téléphone un calendrier
 * est soit trois listes déroulantes — qui demandent trois gestes pour une
 * décision — soit une grille qu'on touche. L'épargne programmée pose la
 * question dans sa forme la plus simple : un JOUR DU MOIS, répété.
 */
export default async function MaquetteEpargnePage() {
  const offres = await repo().listOffers();
  const o = offres.find((x) => x.kind === "FONDS") ?? offres[0];
  if (!o) notFound();
  return (
    <Glissement>
      <MaquetteEpargne titre={o.title} isin={o.isin} vl={o.fund?.nav ?? 10_000} minimum={25_000} />
    </Glissement>
  );
}
