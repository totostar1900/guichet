/**
 * LES BRIEFS DE LA MAISON, ET IL N'Y EN A QU'UN JEU.
 *
 * ─── Ce que cette table répare, le 31 octobre 2026 ──────────────────────────
 *
 * Un service se présentait DEUX FOIS. Dans Trade, une fiche intermédiaire —
 * raison d'être, étapes, un bouton pour continuer — qu'on traversait avant
 * d'arriver au service. Sur la page du service, un « En bref » qui disait la
 * même raison et les mêmes étapes, lues dans la même table. Deux surfaces, un
 * seul texte, et un écran de plus entre le client et ce qu'il venait faire.
 *
 * La demande du dirigeant : « ce n'est pas deux pages distinctes mais bien la
 * même page, qui pourra être reportée ailleurs au besoin ». C'est cette
 * table-là. Un brief porte un identifiant, les services qu'il explique, le
 * titre de sa feuille, et l'ancre que la visite guidée vise quand il y en a
 * une. La prose propre à chaque page vit à côté, en React, parce qu'elle a des
 * liens et des pastilles — mais elle est INDEXÉE PAR CE MÊME IDENTIFIANT, de
 * sorte qu'une tuile de Trade et l'en-tête d'une page de service ouvrent
 * exactement la même chose.
 *
 * ─── Pourquoi les données sont ici, et pas dans le composant ────────────────
 *
 * Le cliquet qui vérifie que chaque service est briefé une fois lisait
 * jusqu'ici les appels `<EnBref cles={[…]}>` À L'EXPRESSION RÉGULIÈRE, dans le
 * source des pages. Un relevé qui lit du texte tombe au premier reformatage,
 * et surtout il rend « aucun service sans brief » quand il ne trouve plus
 * rien : trois verts pour un relevé aveugle. Ici, il lit une donnée.
 *
 * ─── Un brief sans service, et ce n'est pas une anomalie ────────────────────
 *
 * « conservation » ne nomme aucun service, et c'est voulu : la conservation a
 * cessé d'être un service le 31 octobre 2026 — on ne la prend pas, elle
 * commence avec la première ligne — mais ce que la maison doit au client sur
 * ce point ne disparaît pas avec la tuile. Un brief peut donc expliquer une
 * page sans expliquer un geste.
 */
export interface Brief {
  /** Son identifiant, et la clef de sa prose. */
  id: string;
  /** Les services qu'il explique. Vide : il explique une page, pas un geste. */
  cles: string[];
  /** Le titre de la feuille. Traduit à l'ouverture, comme le reste. */
  titre: string;
  /**
   * L'ANCRE DE LA VISITE GUIDÉE, quand une page en a une.
   *
   * Elle se déduit de l'identifiant par défaut — « enbref-fonds » — et c'est
   * assez pour les pages sans visite. La page des fonds, elle, a une étape de
   * visite qui VISE ce bouton : son nom est alors un contrat entre deux
   * fichiers, et un contrat ne se déduit pas.
   */
  coach?: string;
}

export const BRIEFS: Brief[] = [
  { id: "adjudications", cles: ["primaire", "rachat"], titre: "Les adjudications en bref" },
  { id: "sondage", cles: ["sondage"], titre: "Le sondage en bref" },
  { id: "cote", cles: ["cote", "souscription"], titre: "La cote en bref" },
  { id: "fonds", cles: ["fonds", "passage"], titre: "Les fonds en bref", coach: "fonds-enbref" },
  { id: "epargne", cles: ["epargne"], titre: "L'épargne programmée en bref" },
  { id: "reinvestissement", cles: ["reinvestissement"], titre: "Le réinvestissement en bref" },
  { id: "prelevement", cles: ["prelevement"], titre: "Le prélèvement en bref" },
  { id: "provision", cles: ["provision"], titre: "La provision en bref" },
  { id: "conservation", cles: [], titre: "La conservation en bref" },
];

/** Le brief qui explique ce service, pour le « i » d'une tuile de Trade. */
export const briefDuService = (cle: string): Brief | undefined => BRIEFS.find((b) => b.cles.includes(cle));

/** Le brief d'un identifiant, pour l'en-tête d'une page de service. */
export const briefParId = (id: string): Brief | undefined => BRIEFS.find((b) => b.id === id);
