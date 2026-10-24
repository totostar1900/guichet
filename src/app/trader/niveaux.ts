/**
 * LES NIVEAUX DU PARCOURS DE TRADE, HORS DU COMPOSANT.
 *
 * La décision vit ici pour la même raison que celle de `nav-onglets` : un
 * cliquet doit pouvoir la lire sans monter un rendu. Tant qu'elle était une
 * expression au milieu du JSX, la seule garde possible était une garde qui
 * lit du texte — et une garde qui lit du texte tombe quand on reformate.
 *
 * ─── Le cran que « Placer » a perdu, le 24 octobre 2026 ────────────────────
 *
 * Le parcours avait trois crans pour tous les rayons : la question, le rayon,
 * le service. Pour « Placer », le deuxième ne disait rien : ses services sont
 * les façons d'entrer sur une ligne, c'est-à-dire la question même que Trade
 * pose — « Où va mon argent, cette fois-ci ». On touchait donc « Placer »
 * pour lire, en plus petit et un écran plus loin, ce que le titre venait
 * d'annoncer.
 *
 * Les deux autres rayons gardent le leur, et ce n'est pas une exception
 * tolérée : « Programmer » et « Tenir » rangent des gestes de natures
 * différentes — un prélèvement et une épargne programmée ne sont pas deux
 * variantes l'une de l'autre — et leur nom dit quelque chose que la racine ne
 * dit pas.
 *
 * L'ADRESSE NE CHANGE PAS. « ?r=placer&s=fonds » reste écrite en entier :
 * le retour système, l'historique du téléphone et un lien partagé continuent
 * de désigner exactement le même endroit. Seul le nombre d'écrans change.
 */
export const SANS_LISTE = "placer";

/** 0 : la racine. 1 : la liste d'un rayon. 2 : la fiche d'un service. */
export type Niveau = 0 | 1 | 2;

/**
 * Où mène une adresse. `rayon` et `service` sont les clefs déjà résolues :
 * un service introuvable ne vaut pas niveau 2, et c'est l'appelant qui l'a
 * vérifié contre la liste du client.
 */
export const niveauDu = (rayon: string | undefined, service: string | undefined): Niveau => (service ? 2 : rayon && rayon !== SANS_LISTE ? 1 : 0);

/**
 * Le cran précédent, pour la flèche de retour : la clef du rayon où remonter,
 * ou `undefined` pour la racine.
 *
 * Depuis la fiche d'un service de « Placer », on remonte à la racine et non à
 * une liste qui n'existe plus — c'est le défaut qu'une suppression de cran
 * laisse toujours derrière elle.
 */
export const retourDe = (niveau: Niveau, rayon: string | undefined): string | undefined => (niveau === 2 && rayon !== SANS_LISTE ? rayon : undefined);

/**
 * Les crans écrits en haut de l'écran. Le rayon sans liste n'en pose pas :
 * un cran de chemin qui ne ramène nulle part est un mensonge de plus qu'un
 * raccourci.
 */
export const cheminDu = (trade: string, rayon: { cle: string; nom: string } | undefined, service: string | undefined): string[] =>
  [trade, rayon && rayon.cle !== SANS_LISTE ? rayon.nom : undefined, service].filter(Boolean) as string[];
