/**
 * « Comprendre le marché CEMAC » : the second course of the Guide: five
 * folding sections, twenty two-minute lessons. The lessons themselves live
 * with the others in lessons.ts (desk-editable); a lesson belongs to a section
 * through its `section` key. Sections are code: their shapes and colours are
 * the app's, not the desk's.
 */
export type SectionKey = "acteurs" | "instruments" | "risques" | "ordre" | "cadre" | "economie";

export interface Section {
  key: SectionKey;
  order: number;
  title: string;
  blurb: string; // what the section teaches, one sentence
  keywords: string; // the words shown on the folded row
  shape: "circle" | "squares" | "triangle" | "arrow" | "hexagon" | "diamond";
  color: string; // a CSS variable name
}

export const SECTIONS: Section[] = [
  { key: "acteurs", order: 1, title: "Le marché et ses acteurs", blurb: "Qui fixe les règles, qui emprunte, qui porte vos ordres, où sont vos titres.", keywords: "BEAC · COSUMAF · BVMAC · Trésors · SVT · sociétés de gestion · dépositaires", shape: "circle", color: "#15803d" },
  { key: "instruments", order: 2, title: "Les instruments et leurs particularités", blurb: "Reconnaître un instrument à son nom et savoir d'où vient son rendement.", keywords: "BTA · OTA · obligations cotées · APE · actions · OPCVM", shape: "squares", color: "#7c3aed" },
  { key: "risques", order: 3, title: "Les risques, et ce qu'on peut faire", blurb: "Ce qui peut mal tourner, ligne par ligne, et le geste qui protège.", keywords: "crédit · liquidité · prix et taux · allocation et change", shape: "triangle", color: "#c2410c" },
  { key: "ordre", order: 4, title: "Passer un ordre, du Guichet au règlement", blurb: "Où en est votre argent à chaque étape, et ce que vous recevez.", keywords: "intention · adjudication · appel de fonds · relevé", shape: "arrow", color: "#a16207" },
  { key: "cadre", order: 5, title: "Fiscalité, frais et documents", blurb: "Ce qui reste une fois tout payé, et les papiers qui le prouvent.", keywords: "retenue à la source · frais du fonds · relevés et avis", shape: "hexagon", color: "#0e7490" },
  { key: "economie", order: 6, title: "Taux, monnaie et économie : aller plus loin", blurb: "Les mécanismes derrière les chiffres : la parité du CFA, le taux de la BEAC, la courbe des taux, la duration, l'inflation, la signature des États, le marché secondaire, les marchés voisins.", keywords: "franc CFA · TIAO · courbe des taux · duration · taux réel · spread · UMOA-Titres · eurobonds", shape: "diamond", color: "#be185d" },
];

export const SECTION_TITLE: Record<SectionKey, string> = Object.fromEntries(SECTIONS.map((s) => [s.key, s.title])) as Record<SectionKey, string>;
