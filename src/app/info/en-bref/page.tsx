import { getT } from "@/i18n/server";
import { PageDeTexte, choisir } from "../PageDeTexte";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Guichet en bref") };
}

/**
 * GUICHET EN BREF : ce que fait la maison, les instruments, et comment lire les chiffres d'une ligne (19 novembre 2026). C'est de l'information, pas un texte qu'on accepte : elle quitte les mentions légales (le client : « chez nous on est plus à présenter les produits et services comme un résumé du site internet ») et rejoint les éclairages.
 */
export default function EnBrefPage() {
  return <PageDeTexte surTitre="Éclairages" titre="Guichet en bref" phrase="Ce que fait Guichet, les instruments qu'il propose, et la façon de lire les chiffres d'une ligne." blocs={choisir("services", "instruments", "chiffres")} guide="Le Guide · Guichet en bref" />;
}
