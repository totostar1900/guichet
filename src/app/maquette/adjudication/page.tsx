import { notFound } from "next/navigation";
import { Glissement } from "@/components/mobile/Glissement";
import { repo } from "@/lib/data";
import { MaquetteAdjudication } from "./MaquetteAdjudication";

export const metadata = { title: "Maquette · adjudication" };

/**
 * LA DEUXIÈME MAQUETTE : CELLE OÙ L'ON SAISIT DEUX CHOSES.
 *
 * Demandée le 28 octobre 2026, à la suite de la première : « des maquettes
 * semblables pourront être faites pour les autres produits où le client
 * renseigne de la donnée — montant, taux, dates, prix ».
 *
 * L'ADJUDICATION EST LA PLUS CHARGÉE DES QUATRE, et c'est pour cela qu'elle
 * passe la deuxième : si la forme tient ici, elle tient partout. Le client y
 * écrit un MONTANT et un TAUX, et les deux ne se lisent pas pareil — l'un est
 * une somme qu'il possède, l'autre une enchère dont il ne connaît pas encore
 * la conséquence. C'est cette seconde qui est difficile, et c'est elle que la
 * forme doit porter : un taux sans son effet n'est qu'un nombre dans une case.
 */
export default async function MaquetteAdjudicationPage() {
  const offres = await repo().listOffers();
  const o = offres.find((x) => x.kind === "BTA" && x.precountRate) ?? offres.find((x) => x.kind === "BTA") ?? offres[0];
  if (!o) notFound();
  return (
    <Glissement>
      <MaquetteAdjudication
        titre={o.title}
        isin={o.isin}
        nominal={o.nominal ?? 1_000_000}
        tauxIndicatif={o.precountRate ?? 4.75}
        echeance={o.maturityOn ?? ""}
        reglement={o.settleOn ?? ""}
      />
    </Glissement>
  );
}
