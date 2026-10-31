import type { useRouter } from "next/navigation";

/**
 * REVENIR, OU À DÉFAUT ALLER AU REPLI — la règle de la flèche de la barre et de
 * la croix des pages pleines, écrite une seule fois.
 *
 * Un historique est « le nôtre » quand cet onglet a déjà vu une autre de nos
 * pages avant celle-ci (MobileShell le note à chaque navigation). Alors on
 * recule, et Next rend la liste telle qu'on l'a quittée, filtres et défilement
 * compris. Sinon — un lien ouvert depuis WhatsApp, un onglet neuf — reculer
 * quitterait la maison : on va au repli.
 */
export function reculer(router: ReturnType<typeof useRouter>, repli: string): void {
  let nous = false;
  try {
    nous = Boolean(sessionStorage.getItem("guichet:cameFrom"));
  } catch {
    // storage unavailable
  }
  if (nous && window.history.length > 1) router.back();
  else router.push(repli);
}
