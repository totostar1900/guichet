import { getT } from "@/i18n/server";
import { PageDeTexte, choisir } from "../PageDeTexte";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Conditions d'utilisation") };
}

/** CONDITIONS D'UTILISATION : le rôle de la maison, de l'intention au titre inscrit, la protection de l'argent et des titres (19 novembre 2026, un texte par sujet). */
export default function ConditionsPage() {
  return <PageDeTexte surTitre="Textes et conditions" titre="Conditions d'utilisation" phrase="Le rôle de Guichet, la façon dont une intention devient un titre inscrit, et la protection de votre argent." version blocs={choisir("conseil", "ordres", "protection")} guide="Le Guide · conditions d'utilisation" />;
}
