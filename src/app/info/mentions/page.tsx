import { getT } from "@/i18n/server";
import { PageDeTexte, choisir } from "../PageDeTexte";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mentions légales") };
}

/**
 * MENTIONS LÉGALES : QUI EST LA MAISON, ET RIEN D'AUTRE (19 novembre 2026, le client : « les rubriques renvoient au même document »).
 * Les douze sections de l'ancienne page ont été rangées par sujet : conditions d'utilisation, risques, données personnelles, réclamations, et la présentation des services (Guichet en bref). Le texte accepté à la connexion (`legal.ts`) n'a pas changé d'un mot : il est lu, section par section, sur la page de son sujet.
 */
export default function MentionsPage() {
  return <PageDeTexte surTitre="Textes et conditions" titre="Mentions légales" phrase="Qui est Purpose Capital, sous quel agrément, et qui le contrôle." version blocs={choisir("qui")} guide="Le Guide · mentions" />;
}
