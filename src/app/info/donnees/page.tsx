import { getT } from "@/i18n/server";
import { PageDeTexte, choisir } from "../PageDeTexte";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Données personnelles") };
}

/** DONNÉES PERSONNELLES : ce que la maison garde, à quoi cela sert, comment le consulter ou le corriger (19 novembre 2026, un texte par sujet). */
export default function DonneesPage() {
  return <PageDeTexte surTitre="Textes et conditions" titre="Données personnelles" phrase="Ce que nous gardons, à quoi cela sert, et comment les consulter ou les corriger." version blocs={choisir("canaux")} guide="Le Guide · données personnelles" />;
}
