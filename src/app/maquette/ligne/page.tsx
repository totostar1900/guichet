import { Glissement } from "@/components/mobile/Glissement";
import { dureesDe } from "@/lib/domain/sondage";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { MaquetteLigne, type Catalogue } from "./MaquetteLigne";

export const metadata = { title: "Maquette · proposer votre propre ligne" };

/**
 * LA SIXIÈME MAQUETTE : « PROPOSER VOTRE PROPRE LIGNE », REVUE.
 *
 * DEMANDÉ LE 29 OCTOBRE 2026, en cinq points : une page pleine et non une
 * feuille qui monte ; plusieurs durées et plusieurs Trésors ; une fenêtre
 * d'émission, avec un meilleur vocabulaire ; les commentaires en bulles ;
 * une validation à deux étages, avec un aperçu de la ligne.
 *
 * LES LISTES VIENNENT DU DOMAINE — « PAYS_CEMAC » et « dureesDe » — et non
 * de la maquette. C'est la règle posée à la cinquième : une maquette qui
 * dresserait ses propres listes proposerait un jour une durée qu'aucun
 * Trésor ne sert, et on jugerait une forme sur une donnée fausse.
 *
 * Elle vit à une adresse provisoire et part avec la décision.
 */
export default async function MaquetteLignePage() {
  const catalogue: Catalogue = {
    pays: [...PAYS_CEMAC],
    dureesOTA: dureesDe("OTA"),
    dureesBTA: dureesDe("BTA"),
  };
  return (
    <Glissement>
      <MaquetteLigne catalogue={catalogue} />
    </Glissement>
  );
}
