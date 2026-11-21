/**
 * LES MESSAGES DE LA VITRINE, ET CEUX QUI CHANGENT À CHAQUE VISITE (18 novembre 2026, planche « Accueil en quatre écrans », le client : « certains messages aléatoires dans chacune des catégories »).
 *
 * L'accueil du visiteur a six écrans, un message par écran : le hub (ce qu'on trouve ici), la durée (les produits), investir, la région, vous (« en toute sérénité », le sérieux de la maison) ; un sixième écran, « à chaque étape », a un titre fixe. Chaque écran a trois variantes ; une seule est tirée à chaque ouverture de la page, CÔTÉ SERVEUR : pas de saut à l'écran, et un visiteur qui revient n'a pas toujours la même accroche.
 *
 * L'ÉCRAN « DURÉE » (18 novembre 2026, le client : « une page sur les rendements qui sécurisent le futur de l'investisseur ») NE DIT NI « RENDEMENT » NI « SÉCURISE » : la règle de la vitrine interdit toute promesse, et un placement ne sécurise rien. Il dit comment chaque placement fonctionne, avec ce que rien ne garantit.
 *
 * LES RÈGLES DE LA VITRINE TIENNENT POUR CHAQUE VARIANTE (gardées par `src/test/vitrine-messages.test.ts`) : aucun chiffre, aucun taux, aucun rendement, aucune promesse de gain, aucune garantie. Une phrase sur l'effet d'un placement sur la région dit « peut » ou décrit ce que le marché permet, jamais ce qu'il rapporte.
 * Le client avait écrit « toute la finance en Afrique centrale » : la maison n'offre ni toute la finance ni tous les produits, la phrase dit donc « les marchés financiers ».
 */
export const CATEGORIES = ["hub", "futur", "investir", "region", "vous"] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const MESSAGES: Record<Categorie, readonly string[]> = {
  hub: ["Le hub des produits financiers d'Afrique centrale.", "La porte d'entrée des marchés financiers d'Afrique centrale.", "Accédez aux marchés financiers d'Afrique centrale.", "Les marchés financiers d'Afrique centrale, à portée de main."],
  futur: ["Faites travailler votre épargne dans la durée.", "Pensez long terme : des placements faits pour durer.", "Préparez l'avenir, un placement à la fois.", "Donnez du temps à votre épargne pour porter vos projets."],
  investir: ["Investir pour le futur.", "Investir pour ceux qui comptent.", "Votre épargne peut financer la région.", "Investir pour l'avenir de votre famille."],
  region: ["Contribuer au développement de la zone.", "Une région qui se construit grâce à vos placements.", "Une région qui se finance est une région qui se construit.", "Votre épargne peut faire avancer toute une région."],
  vous: ["En toute sérénité.", "Investissez en toute sérénité.", "Avancez en toute sérénité."],
};

/**
 * LE MOT QUI PREND LA COULEUR (21 novembre 2026, planche « Accueil », choix 1C : un accent chaud, corail, sur un mot clé par titre). Le mot est écrit tel qu'il figure dans la phrase, en français puis en anglais ; l'accueil le cherche dans la phrase AFFICHÉE, et ne colore rien s'il ne la trouve pas (un cliquet garde que chaque mot s'y trouve).
 */
export const MOTS_CLES: Record<string, readonly [fr: string, en: string]> = {
  "Le hub des produits financiers d'Afrique centrale.": ["Afrique centrale", "Central Africa"],
  "La porte d'entrée des marchés financiers d'Afrique centrale.": ["Afrique centrale", "Central Africa"],
  "Accédez aux marchés financiers d'Afrique centrale.": ["Afrique centrale", "Central Africa"],
  "Les marchés financiers d'Afrique centrale, à portée de main.": ["à portée de main", "within easy reach"],
  "Faites travailler votre épargne dans la durée.": ["épargne", "savings"],
  "Pensez long terme : des placements faits pour durer.": ["long terme", "long term"],
  "Préparez l'avenir, un placement à la fois.": ["l'avenir", "the future"],
  "Donnez du temps à votre épargne pour porter vos projets.": ["vos projets", "your plans"],
  "Investir pour le futur.": ["futur", "future"],
  "Investir pour ceux qui comptent.": ["ceux qui comptent", "people who matter"],
  "Votre épargne peut financer la région.": ["la région", "the region"],
  "Investir pour l'avenir de votre famille.": ["votre famille", "your family"],
  "Contribuer au développement de la zone.": ["développement", "development"],
  "Une région qui se construit grâce à vos placements.": ["vos placements", "your investments"],
  "Une région qui se finance est une région qui se construit.": ["se construit", "builds itself"],
  "Votre épargne peut faire avancer toute une région.": ["toute une région", "a whole region"],
  "En toute sérénité.": ["sérénité", "peace of mind"],
  "Investissez en toute sérénité.": ["sérénité", "peace of mind"],
  "Avancez en toute sérénité.": ["sérénité", "peace of mind"],
};

/**
 * LES PHRASES QUI CHANGENT AUSSI (21 novembre 2026, planche « Accueil », choix 5 : « un mélange de l'actuel et du proposé, sans le mot desk ; les phrases changent au hasard dans leur section »). Chaque clé est une place de l'accueil ; chaque entrée est un jeu de phrases qui s'affichent ENSEMBLE (la phrase d'accroche et son texte). Aucune ne contient « desk » : c'est un mot de la maison, pas du client. La mention de risque du pied n'est dans aucun tirage : elle ne change jamais.
 */
export const PHRASES = {
  famille: [
    ["Investir, c'est penser à ceux qui comptent.", "Un placement fait avec méthode peut aider à préparer les projets d'une famille ; rien n'est garanti, mais la démarche, elle, se transmet."],
    ["Investir, c'est penser à ceux qui comptent.", "Un placement fait avec méthode peut aider à préparer les projets de votre famille. Rien n'est garanti."],
  ],
  vous: [["Une maison sérieuse, à vos côtés à chaque étape."], ["Une équipe à vos côtés, à chaque étape."]],
  conseillers: [
    ["Des conseillers à votre écoute, en français, en anglais et sans jargon, à chaque étape."],
    ["Des conseillers à votre écoute, en français et en anglais, avec des mots simples."],
  ],
  ouvrir: [["S'il manque une pièce, nous vous aidons, à votre rythme."], ["Une pièce manque ? Nous vous le disons simplement, à votre rythme."]],
  choisir: [["Chaque chiffre est expliqué, la décision reste la vôtre."], ["Chaque chiffre est expliqué, pour décider en confiance."]],
  ordre: [["Rien n'est débité sans votre accord."], ["Votre argent ne bouge qu'avec votre accord."]],
} as const satisfies Record<string, readonly (readonly string[])[]>;
export type PlacePhrase = keyof typeof PHRASES;

/** Un jeu de phrases par place, tiré au hasard (`hasard` injecté pour les tests). */
export function tirerLesPhrases(hasard: () => number = Math.random): { [K in PlacePhrase]: readonly string[] } {
  const out = {} as { [K in PlacePhrase]: readonly string[] };
  for (const k of Object.keys(PHRASES) as PlacePhrase[]) {
    const pool = PHRASES[k];
    out[k] = pool[Math.min(pool.length - 1, Math.floor(hasard() * pool.length))];
  }
  return out;
}

/** Un message par catégorie, tiré au hasard (`hasard` rend un nombre de [0, 1[ ; injecté pour les tests). */
export function tirerLesMessages(hasard: () => number = Math.random): Record<Categorie, string> {
  const out = {} as Record<Categorie, string>;
  for (const c of CATEGORIES) {
    const pool = MESSAGES[c];
    out[c] = pool[Math.min(pool.length - 1, Math.floor(hasard() * pool.length))];
  }
  return out;
}
