import { getT } from "@/i18n/server";
import { annonceDuJour } from "@/lib/annonce";
import { BandeauFermable } from "./BandeauFermable";

/**
 * L'ANNONCE DE LA MAISON, AU-DESSUS DES PAGES (14 novembre 2026, planche 4A) : une phrase écrite au desk, une seule à la fois, qui s'efface à sa date de fin.
 *
 * Elle vient EN PLUS de ce que les pages disent déjà : « À la une », les actualités et le préavis d'un ordre gardent leur place (le préavis reste le premier bloc de la page
 * d'arrivée, il demande une décision avant demain). Sans annonce en cours, la pièce ne rend rien : pas de cadre vide, pas de « rien à signaler ».
 */
export async function BandeauDAnnonce() {
  const a = await annonceDuJour().catch(() => undefined);
  if (!a) return null;
  const t = await getT();
  return <BandeauFermable id={a.id} texte={a.texte} etiquette={t("Annonce")} fermer={t("Fermer l'annonce")} />;
}
