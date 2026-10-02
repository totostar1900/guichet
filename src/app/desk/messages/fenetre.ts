/**
 * La fenêtre de 24 h de WhatsApp, calculée plutôt que racontée.
 *
 * LA RÈGLE. Meta n'accepte un texte libre vers un numéro que dans les 24 heures
 * qui suivent le dernier message de ce numéro. Au delà, il faut un modèle
 * approuvé, et la maison n'en a pas encore.
 *
 * CE QU'ELLE ÉTAIT. La règle ne vivait que dans le texte d'invite du champ,
 * « fenêtre de 24 h après le dernier message du client », en petits caractères
 * gris, sans dire si elle était ouverte ni pour combien de temps. Un opérateur
 * écrivait, cliquait, et récoltait un échec de Meta sans comprendre lequel.
 *
 * ELLE N'INTERDIT RIEN. L'état s'affiche, le bouton reste ouvert. Une horloge
 * qui se trompe, un message entrant arrivé entre deux rendus, et un garde
 * fermerait le desk sur une déduction. Dire vaut mieux qu'empêcher : la mesure
 * sert à choisir, pas à barrer.
 */
export const FENETRE_MS = 24 * 60 * 60 * 1000;

export type Fenetre = {
  ouverte: boolean;
  /** Ce qu'il reste, en millisecondes, jamais négatif. */
  resteMs: number;
  /** Les heures pleines restantes, pour l'affichage. */
  heures: number;
  /** Les minutes au delà des heures pleines. */
  minutes: number;
};

const FERMEE: Fenetre = { ouverte: false, resteMs: 0, heures: 0, minutes: 0 };

/**
 * `dernierRecuAt` est la date du dernier message VENU du client. Sans message
 * entrant, il n'y a jamais eu de fenêtre : c'est fermé, pas inconnu.
 */
export function fenetreWhatsApp(dernierRecuAt: string | undefined, maintenant: number): Fenetre {
  if (!dernierRecuAt) return FERMEE;
  const depuis = Date.parse(dernierRecuAt);
  if (!Number.isFinite(depuis)) return FERMEE;
  const reste = depuis + FENETRE_MS - maintenant;
  if (reste <= 0) return FERMEE;
  return { ouverte: true, resteMs: reste, heures: Math.floor(reste / 3_600_000), minutes: Math.floor((reste % 3_600_000) / 60_000) };
}
