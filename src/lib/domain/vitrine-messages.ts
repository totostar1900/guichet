/**
 * LES MESSAGES DE LA VITRINE, ET CEUX QUI CHANGENT À CHAQUE VISITE (18 novembre 2026, planche « Accueil en quatre écrans », le client : « certains messages aléatoires dans chacune des catégories »).
 *
 * L'accueil du visiteur a cinq écrans, un message par écran : le hub (ce qu'on trouve ici), la durée, investir, la région, vous. Chaque écran a trois variantes ; une seule est tirée à chaque ouverture de la page, CÔTÉ SERVEUR : pas de saut à l'écran, et un visiteur qui revient n'a pas toujours la même accroche.
 *
 * L'ÉCRAN « DURÉE » (18 novembre 2026, le client : « une page sur les rendements qui sécurisent le futur de l'investisseur ») NE DIT NI « RENDEMENT » NI « SÉCURISE » : la règle de la vitrine interdit toute promesse, et un placement ne sécurise rien. Il dit comment chaque placement fonctionne, avec ce que rien ne garantit.
 *
 * LES RÈGLES DE LA VITRINE TIENNENT POUR CHAQUE VARIANTE (gardées par `src/test/vitrine-messages.test.ts`) : aucun chiffre, aucun taux, aucun rendement, aucune promesse de gain, aucune garantie. Une phrase sur l'effet d'un placement sur la région dit « peut » ou décrit ce que le marché permet, jamais ce qu'il rapporte.
 * Le client avait écrit « toute la finance en Afrique centrale » : la maison n'offre ni toute la finance ni tous les produits, la phrase dit donc « les marchés financiers ».
 */
export const CATEGORIES = ["hub", "futur", "investir", "region", "vous"] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const MESSAGES: Record<Categorie, readonly string[]> = {
  hub: ["Le hub des produits financiers d'Afrique centrale.", "La porte d'entrée des marchés financiers d'Afrique centrale.", "Accédez aux marchés financiers d'Afrique centrale."],
  futur: ["Faites travailler votre épargne dans la durée.", "Pensez long terme : des placements faits pour durer.", "Préparez l'avenir, un placement à la fois."],
  investir: ["Investir pour le futur.", "Participez au financement des États et des entreprises de la zone.", "Votre épargne peut financer la région."],
  region: ["Contribuer au développement de la zone.", "Elle se construit ici, avec des fonds d'ici.", "Une région qui se finance est une région qui se construit."],
  vous: ["Vous gardez la main, et le risque est écrit.", "Vos titres sont à votre nom, et aucun ordre ne part sans vous.", "Un compte qui se crée en quelques instants, et un conseiller qui répond."],
};

/** Un message par catégorie, tiré au hasard (`hasard` rend un nombre de [0, 1[ ; injecté pour les tests). */
export function tirerLesMessages(hasard: () => number = Math.random): Record<Categorie, string> {
  const out = {} as Record<Categorie, string>;
  for (const c of CATEGORIES) {
    const pool = MESSAGES[c];
    out[c] = pool[Math.min(pool.length - 1, Math.floor(hasard() * pool.length))];
  }
  return out;
}
