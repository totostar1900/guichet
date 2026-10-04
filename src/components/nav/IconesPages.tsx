/**
 * UNE ICÔNE PAR PAGE, POUR LES TUILES.
 *
 * Les tuiles remplacent une rangée qui disait un nom et une phrase. Sans
 * dessin, une grille de noms courts serait moins lisible que la rangée qu'elle
 * remplace : c'est la silhouette qu'on reconnaît avant de lire, et c'est tout
 * ce que l'icône a à faire. Donc une forme par page, et jamais deux pages de la
 * même grille avec la même.
 *
 * Elles ne portent aucune couleur : la tuile la pose, et l'état « où l'on est »
 * se lit sur le cadre, pas sur le trait.
 */
const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {d}
  </svg>
);

export const ICONE_PAGE: Record<string, React.ReactNode> = {
  /* Le portefeuille : ce qu'on a, et ce qui en découle. */
  bord: svg(
    <>
      <path d="M4 7h16v12H4z" />
      <path d="M8 7V5h8v2M4 12h16" />
    </>,
  ),
  // L'analyse : une part, parce que la première question est « combien de quoi ».
  performance: svg(
    <>
      <path d="M12 3a9 9 0 1 0 9 9h-9z" />
      <path d="M14 3.4A9 9 0 0 1 20.6 10H14z" />
    </>,
  ),
  // Réinvestir : le tour complet d'un coupon qui retourne au marché.
  reinvestir: svg(
    <>
      <path d="M20 10a8 8 0 1 0-2 6" />
      <path d="M20 4v6h-6" />
    </>,
  ),
  documents: svg(
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h6M9 16h4" />
    </>,
  ),

  /* Ce qui s'achète. */
  // Les titres : des lignes, dont une porte sa cotation.
  titres: svg(
    <>
      <path d="M4 18h16M4 6h10M4 12h13" />
      <circle cx="19" cy="7" r="2" />
    </>,
  ),
  // Les fonds : une part d'un ensemble, puisqu'on y achète une fraction.
  fonds: svg(
    <>
      <path d="M12 3a9 9 0 1 0 9 9h-9z" />
      <path d="M14 3.4A9 9 0 0 1 20.6 10H14z" />
    </>,
  ),
  // Les adjudications : une date, parce que c'est la clôture qui commande.
  calendrier: svg(
    <>
      <path d="M4 5h16v15H4z" />
      <path d="M4 9h16M9 3v4M15 3v4" />
      <path d="M8 14h3" />
    </>,
  ),

  /* Ce qui se lit. */
  // La vue d'ensemble : quatre cadres, donc plusieurs choses à la fois.
  marche: svg(
    <>
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </>,
  ),
  indice: svg(
    <>
      <path d="M3 17l5-6 4 4 6-9" />
      <path d="M14 6h6v6" />
    </>,
  ),
  societes: svg(
    <>
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="M10 21v-6h4v6" />
    </>,
  ),
  notes: svg(
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h6M9 16h4" />
    </>,
  ),
  // Comparer : deux hauteurs, et la troisième qui sert de repère.
  comparer: svg(
    <>
      <path d="M6 20V9M12 20V4M18 20v-7" />
    </>,
  ),
  actualites: svg(
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M7 9h6M7 13h10M7 16h8" />
    </>,
  ),
  lecon: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6v.9" />
    </>,
  ),
};
