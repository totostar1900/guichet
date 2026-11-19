import { getT } from "@/i18n/server";
import { PageDeTexte, choisir } from "../PageDeTexte";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Réclamations") };
}

/** RÉCLAMATIONS : à qui s'adresser d'abord, et la COSUMAF à défaut d'accord (19 novembre 2026, un texte par sujet). */
export default function ReclamationsPage() {
  return <PageDeTexte surTitre="Textes et conditions" titre="Réclamations" phrase="À qui s'adresser d'abord, et la COSUMAF à défaut d'accord." version blocs={choisir("reclamation")} guide="Le Guide · réclamations" />;
}
