import { CeQuiFermeBientot } from "@/components/CeQuiFermeBientot";
import { SelectionDuDesk, lignesDuDesk } from "@/components/SelectionDuDesk";
import { echeancesProches } from "@/lib/domain/echeances";
import type { Offer } from "@/lib/domain/types";

/**
 * LES OCCASIONS, EN HAUT DE LA PAGE : la sélection du desk, puis les échéances.
 *
 * Chacune est une bande pleine largeur dont les lignes sont des tuiles. Les
 * deux se taisent quand elles n'ont rien à dire — et ce chapitre avec elles :
 * un conteneur qui resterait vide laisserait un écart de chapitre (44 px) pour
 * rien. D'où la question posée ICI, avant de rendre quoi que ce soit : s'il n'y
 * a ni sélection ni échéance, on ne rend pas même la pile.
 *
 * « ÉCHÉANCES » REMPLACE « CE QUI FERME BIENTÔT » sur cette page (la bande de
 * Trade garde son titre et son lien vers le calendrier). Deux lignes, les plus
 * pressantes, et le lien vers la page de l'horloge qui les porte toutes.
 */
export async function TuilesDuHaut({ offres }: { offres: Offer[] }) {
  const now = new Date();
  const aDuDesk = lignesDuDesk(offres, now).length > 0;
  const aEcheances = echeancesProches(offres, now).length > 0;
  if (!aDuDesk && !aEcheances) return null;
  return (
    <div className="pile">
      <SelectionDuDesk offres={offres} sobre />
      <CeQuiFermeBientot offres={offres} max={2} titre="Échéances" lien={{ href: "/echeances", mot: "Toutes les échéances" }} sobre />
    </div>
  );
}
