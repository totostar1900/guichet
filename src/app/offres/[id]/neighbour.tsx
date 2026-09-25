"use server";

import { repo } from "@/lib/data";
import { FicheReading, loadFiche } from "./FicheReading";
import { FichePanes } from "@/components/mobile/FichePanes";

/**
 * La fiche d'à côté, rendue pour de bon.
 *
 * Pendant le glissement, ce qui entrait sous le doigt était une vignette : un
 * cachet, un titre, un chiffre. La page n'arrivait qu'au relâchement. Ici c'est
 * la vraie lecture de la ligne voisine qui voyage sous le doigt.
 *
 * Elle se demande à l'ouverture de la fiche, pas au moment du geste : quand le
 * doigt part, elle est déjà là.
 *
 * Deux choses n'en sont pas : le formulaire d'intention et la barre d'action.
 * On lit en glissant, on n'engage rien ; et deux formulaires dans la même page
 * se disputeraient le même champ. Ils reviennent avec la vraie page, que le
 * relâchement ouvre et qui est déjà préchargée.
 *
 * Le corps porte sa propre enveloppe de volets : sur téléphone la fiche se lit
 * en quatre compartiments, et c'est le CSS du parent qui en montre un. Sans
 * enveloppe à lui, le voisin les montrerait tous les quatre à la fois.
 */
export async function neighbourReading(offerId: string): Promise<React.ReactNode> {
  const o = await repo().getOffer(offerId);
  if (!o || o.hidden || o.status === "withdrawn") return null;
  const data = await loadFiche(o);
  return (
    <FichePanes>
      <FicheReading o={o} data={data} />
    </FichePanes>
  );
}
