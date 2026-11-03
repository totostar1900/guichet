import type { Country } from "@/lib/domain/types";

/**
 * LE DRAPEAU D'UN TRÉSOR, DESSINÉ (4 novembre 2026).
 *
 * « Les drapeaux des pays et non une seule couleur. » Les six drapeaux de la zone, en SVG : un emoji de drapeau n'existe
 * pas sous Windows, où il s'affiche en deux lettres, et la cote est lue sur ordinateur autant que sur téléphone. Chacun tient
 * dans un rectangle de 3 pour 2, et reste lisible à 14 px : les bandes et les armoiries ne sont gardées que si elles se voient
 * à cette taille — l'étoile du Cameroun et celle de la RCA, le triangle de la Guinée équatoriale.
 *
 * Il est décoratif : le code du pays (« GA ») est toujours écrit à côté, et la teinte ne porte rien seule.
 */
const FOND = { stroke: "rgba(127,127,127,.45)", strokeWidth: 0.6 } as const;

const ETOILE = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rayon = i % 2 === 0 ? r : r * 0.4;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rayon * Math.cos(a)).toFixed(2)},${(cy + rayon * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
};

function Motif({ pays }: { pays: Country }) {
  switch (pays) {
    case "Cameroun":
      return (
        <>
          <rect width="10" height="20" fill="#007a5e" />
          <rect x="10" width="10" height="20" fill="#ce1126" />
          <rect x="20" width="10" height="20" fill="#fcd116" />
          <polygon points={ETOILE(15, 10, 4.2)} fill="#fcd116" />
        </>
      );
    case "Gabon":
      return (
        <>
          <rect width="30" height="7" fill="#009e60" />
          <rect y="7" width="30" height="6.5" fill="#fcd116" />
          <rect y="13.5" width="30" height="6.5" fill="#3a75c4" />
        </>
      );
    case "Congo":
      return (
        <>
          <rect width="30" height="20" fill="#fbde4a" />
          <polygon points="0,0 20,0 0,20" fill="#009543" />
          <polygon points="30,20 10,20 30,0" fill="#dc241f" />
        </>
      );
    case "Tchad":
      return (
        <>
          <rect width="10" height="20" fill="#002664" />
          <rect x="10" width="10" height="20" fill="#fecb00" />
          <rect x="20" width="10" height="20" fill="#c60c30" />
        </>
      );
    case "RCA":
      return (
        <>
          <rect width="30" height="5" fill="#003082" />
          <rect y="5" width="30" height="5" fill="#ffffff" />
          <rect y="10" width="30" height="5" fill="#289728" />
          <rect y="15" width="30" height="5" fill="#ffce00" />
          <rect x="12.5" width="5" height="20" fill="#d21034" />
          <polygon points={ETOILE(5, 2.7, 2.2)} fill="#ffce00" />
        </>
      );
    case "Guinée éq.":
      return (
        <>
          <rect width="30" height="7" fill="#3e9a00" />
          <rect y="7" width="30" height="6.5" fill="#ffffff" />
          <rect y="13.5" width="30" height="6.5" fill="#e32118" />
          <polygon points="0,0 10,10 0,20" fill="#0073ce" />
        </>
      );
  }
}

export function Drapeau({ pays, largeur = 15 }: { pays: Country; largeur?: number }) {
  return (
    <svg viewBox="0 0 30 20" width={largeur} height={(largeur * 2) / 3} aria-hidden="true" style={{ flex: "none", display: "inline-block", borderRadius: 2, verticalAlign: "-2px" }}>
      <Motif pays={pays} />
      <rect width="30" height="20" fill="none" {...FOND} strokeWidth={1} />
    </svg>
  );
}
