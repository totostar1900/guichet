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

const BORD = svg(
  <>
    <path d="M4 7h16v12H4z" />
    <path d="M8 7V5h8v2M4 12h16" />
  </>,
);

export const ICONE_PAGE: Record<string, React.ReactNode> = {
  /* Le portefeuille : ce qu'on a, et ce qui en découle. */
  bord: BORD,
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

  /**
   * LE COMPTE : ce qui est à moi, et ce qui est à la maison.
   *
   * Ces huit-là se partageaient cinq dessins. En rangée le nom portait, et
   * deux documents identiques à dix lignes d'écart ne se voyaient pas ; dans
   * une grille, côte à côte, la silhouette se lit avant le nom.
   */
  espace: BORD,
  profil: svg(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>,
  ),
  securite: svg(
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>,
  ),
  // Les pièces : une chemise, et non une feuille, pour la distinguer des deux
  // documents de la même feuille.
  pieces: svg(
    <>
      <path d="M3 7h6l2 2h10v10H3z" />
      <path d="M7 13h8" />
    </>,
  ),
  guide: svg(
    <>
      <path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" />
      <path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
    </>,
  ),
  aide: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 2.9 2.9v1.1M12.4 17v.1" />
    </>,
  ),
  risques: svg(
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17v.1" />
    </>,
  ),
  mentions: svg(
    <>
      <path d="M5 4h14v16H5z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>,
  ),
};
