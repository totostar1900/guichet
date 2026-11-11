import type { useRouter } from "next/navigation";

/**
 * REVENIR À UNE ÉTAPE : RECULER SI C'EST LA PAGE D'AVANT, LA REMPLACER SINON (10 novembre 2026, audit « Mon argent »).
 *
 * La flèche du haut et les boutons « Retour » des formulaires font la même chose : si la cible est la page d'où l'on vient, on recule dans l'historique (pas de page de plus, donc pas de boucle avec le retour Android) ;
 * sinon la page courante est remplacée par la cible (et la pile des pages vues en prend note, voir « nav-pile »).
 */
export function retourEtape(router: ReturnType<typeof useRouter>, cible: string): void {
  let precedent: string | null = null;
  try {
    precedent = sessionStorage.getItem("guichet:cameFrom");
  } catch {
    // storage unavailable
  }
  if (precedent && precedent.split("?")[0] === cible.split("?")[0] && window.history.length > 1) {
    router.back();
    return;
  }
  try {
    sessionStorage.setItem("guichet:remplace", "1");
  } catch {
    // storage unavailable
  }
  router.replace(cible, { transitionTypes: ["nav-retour"] });
}
