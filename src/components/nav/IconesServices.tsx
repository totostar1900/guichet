/**
 * UNE ICÔNE PAR SERVICE, ET C'EST SON CADRE QUI DIT L'ÉTAT.
 *
 * La page posait neuf cartes de la même forme, donc rien ne disait par où
 * commencer. Une silhouette se reconnaît avant qu'on lise, et le cadre qui la
 * porte se colore : doré quand quelque chose attend la main du client, vert
 * quand le service tourne déjà. Le trait du dessin, lui, ne change pas : neuf
 * dessins dorés feraient neuf alertes.
 */
import styles from "./IconesServices.module.css";
/**
 * LE TRAIT VIENT DE LA FEUILLE DES ICÔNES, et non de celle qui les pose.
 *
 * Ces dessins n'ont aucun attribut de peinture : le défaut de SVG est alors
 * « fill: black, stroke: none », et chacun sortait en APLAT au lieu du trait
 * qu'il dessine. Les trois feuilles qui les posent — tuile, bande, rubrique —
 * ne le corrigeaient nulle part. La classe ci-dessous le fait une fois.
 */
const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icone}>
    {d}
  </svg>
);

export const ICONE_SERVICE: Record<string, React.ReactNode> = {
  // Le tour complet d'un coupon qui repart au marché.
  reinvestissement: svg(
    <>
      <path d="M20 10a8 8 0 1 0-2 6" />
      <path d="M20 4v6h-6" />
    </>,
  ),
  // Une date, et la somme qui tombe ce jour-là.
  epargne: svg(
    <>
      <path d="M4 6h16v14H4z" />
      <path d="M4 10h16M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="2" />
    </>,
  ),
  // La garde : ce qui est inscrit à votre nom, et protégé.
  garde: svg(
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>,
  ),
  // L'adjudication : le marteau d'une séance.
  primaire: svg(
    <>
      <path d="M3 20h10" />
      <path d="M10 7l-5 5 3 3 5-5z" />
      <path d="M15 9l5-5M12 4l4 4" />
    </>,
  ),
  // Une part d'un ensemble, puisqu'on en achète une fraction.
  fonds: svg(
    <>
      <path d="M12 3a9 9 0 1 0 9 9h-9z" />
      <path d="M14 3.4A9 9 0 0 1 20.6 10H14z" />
    </>,
  ),
  // Des lignes de cote, dont une porte sa cotation.
  cote: svg(
    <>
      <path d="M4 18h16M4 6h10M4 12h13" />
      <circle cx="19" cy="7" r="2" />
    </>,
  ),
  // Une fenêtre qui se ferme : la souscription dure, puis elle n'est plus là.
  souscription: svg(
    <>
      <path d="M7 3h10M7 21h10" />
      <path d="M8 3v3.5l4 4 4-4V3" />
      <path d="M8 21v-3.5l4-4 4 4V21" />
    </>,
  ),
  // Le rachat : la ligne revient au Trésor, et sort de chez vous.
  rachat: svg(
    <>
      <path d="M20 4v6a4 4 0 0 1-4 4H6" />
      <path d="M9 11l-3 3 3 3" />
      <path d="M4 20h16" />
    </>,
  ),
  // Passer d'une part à une autre : deux sens, sans sortir.
  passage: svg(
    <>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </>,
  ),
  // Le sondage : une question posée avant la séance.
  sondage: svg(
    <>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M9.6 9a2.2 2.2 0 1 1 2.6 2.5v.9" />
    </>,
  ),
  // La provision : une réserve posée, prête à régler.
  provision: svg(
    <>
      <path d="M4 9h16v9H4z" />
      <path d="M4 9V6h12v3" />
      <circle cx="16" cy="13.5" r="1.6" />
    </>,
  ),
  // Le prélèvement : la maison va chercher, au jour dit.
  prelevement: svg(
    <>
      <path d="M12 3v10l3-3M12 13l-3-3" />
      <path d="M4 16v3h16v-3" />
    </>,
  ),
  /* « appariement » EST PARTI AVEC SON SERVICE. Les trois poseurs de cette
     table indexent par clef de service, et l'appariement a quitté la vitrine
     en septembre : la plateforme recueille les ordres et les transmet à la
     BVMAC, qui seule exécute, donc le nommer promettait ce que la maison ne
     peut pas donner. Son dessin restait là, et aucun écran ne l'atteignait. */
};
