/**
 * LA PAGE D'UNE FICHE, ET ELLE SEULE, PEUT DEMANDER SES VOISINES.
 *
 * « neighbourReading » est une action serveur qui rend des composants client de la
 * fiche (FichePanes, KpiCard, FicheHead…). Une action est exécutée DANS la route
 * qui l'appelle, et seuls les composants client que cette route porte figurent à
 * son manifeste : appelée depuis « /info/[key] », elle rendait la fiche voisine
 * sans en trouver un seul — « Could not find the module … in the React Client
 * Manifest ». Reproduit le 1er novembre 2026 sur le build de production : la même
 * action rend ses voisines sur « /offres/{id} » et échoue sur « /info/{clé} ».
 *
 * Le critère est le chemin, pas le contexte : « /offres/{id} » exactement. La
 * page d'intention (« /offres/{id}/intention ») n'a pas de voisines et n'en demande pas.
 */
export function estUneFiche(url: string | null | undefined): boolean {
  if (!url) return false;
  let chemin: string;
  try {
    chemin = new URL(url, "http://guichet.local").pathname;
  } catch {
    return false;
  }
  return /^\/offres\/[^/]+\/?$/.test(chemin);
}
