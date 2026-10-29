import { notFound } from "next/navigation";
import { Glissement } from "@/components/mobile/Glissement";
import { arriveesPossibles, casDArbitrage } from "@/lib/domain/arbitrage";
import { repo } from "@/lib/data";
import { MaquetteArbitrage, type Cible } from "./MaquetteArbitrage";

export const metadata = { title: "Maquette · déplacer un placement" };

/**
 * LA CINQUIÈME MAQUETTE, ET LA PLUS DIFFICILE : DEUX LIGNES ET UNE BORNE.
 *
 * Les quatre autres posent une question sur UNE ligne. L'arbitrage n'est ni
 * son départ ni son arrivée : c'est le mouvement entre les deux, et aucun
 * écran de la maison ne le montre — la forme actuelle en fait une liste
 * déroulante intitulée « Replacer le produit dans (facultatif) », posée au
 * bas d'un formulaire de vente.
 *
 * LES ARRIVÉES VIENNENT DU DOMAINE, ET NON DE LA MAQUETTE. « arriveesPossibles »
 * et « casDArbitrage » sont les fonctions mêmes que la page réelle emploie :
 * une maquette qui dresserait sa propre liste pourrait proposer d'arriver sur
 * une adjudication, c'est-à-dire promettre exactement ce que le service
 * existe pour empêcher. On juge une FORME ici, pas une règle — les règles
 * sont déjà écrites, et elles sont bonnes.
 *
 * Elle vit à une adresse provisoire et part avec la décision.
 */
export default async function MaquetteArbitragePage() {
  const offres = await repo().listOffers();
  /* Un départ : ce qui se revend, et qui porte un prix à montrer. */
  const depart = offres.find((o) => o.kind === "FONDS" && o.fund?.nav) ?? offres.find((o) => o.kind === "MARCHE" && o.lastPrice);
  if (!depart) notFound();

  const cibles: Cible[] = arriveesPossibles(depart, offres)
    .slice(0, 4)
    .map((o) => ({
      id: o.id,
      titre: o.title,
      quoi: o.kind === "FONDS" ? "fonds · souscription à la valeur liquidative" : "ligne cotée · achat au carnet de la BVMAC",
      simultane: casDArbitrage(depart, o).cas === "simultane",
    }));

  /* Ce que la position vaut, au dernier prix connu : un repère, pas une
     suggestion — la maquette ne propose aucun montant, c'est la règle posée
     à la première. */
  const valeur = Math.round((depart.fund?.nav ?? depart.lastPrice ?? 0) * 120);

  return (
    <Glissement>
      <MaquetteArbitrage titre={depart.title} isin={depart.isin} detenu={valeur} cibles={cibles} />
    </Glissement>
  );
}
