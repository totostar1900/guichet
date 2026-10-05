/**
 * Ce que rend une action de desk qui parle : une phrase, ou une panne.
 *
 * Le type vivait dans les actions de Santé, et le bouton en dépendait. Les
 * actions ayant rejoint leurs domiciles, trois fichiers l'auraient importé
 * de la page d'un quatrième : il vit donc seul, et personne ne dépend de
 * l'endroit où une action se trouve aujourd'hui.
 */
export interface RereadResult {
  ok?: string;
  error?: string;
}
