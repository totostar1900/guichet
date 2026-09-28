import { redirect } from "next/navigation";

/**
 * La courbe a rejoint les analyses.
 *
 * Elle avait son écran, et personne ne lisait l'un sans l'autre : un rendement
 * congolais à seize pour cent ne se comprend qu'à côté d'une couverture tombée
 * sous cent, et le chemin entre les deux pages était exactement l'endroit où
 * l'on renonçait à vérifier.
 *
 * L'adresse reste et redirige plutôt que de rendre une page manquante : le desk
 * l'a en signet, et la note de marché d'hier y renvoie.
 */
export default function CourbePage() {
  redirect("/desk/analyses#courbe");
}
