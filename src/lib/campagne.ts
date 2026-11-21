/**
 * LE CALQUE « CAMPAGNE » (21 novembre 2026, « ok pour le calque campagne » ; but : un jeu de thème par campagne marketing ou de communication, posé ou retiré en un prompt).
 *
 * UN SEUL FICHIER À MODIFIER. « CAMPAGNE » est VIDE par défaut : l'application garde ses couleurs. Une campagne y écrit, au choix, et seulement ce qu'elle change :
 *
 *   accents : l'accent d'une famille de pages (« or » | « bleu »), qui redit « ACCENTS » (src/lib/config.ts) ;
 *   marque  : les trois or de la marque (« MARQUE », src/lib/marque.ts), lus par la barre du haut, les PDF, les e-mails, les palettes ;
 *   jetons  : des jetons CSS à redire, communs ou par thème (« clair », « tamise », « sombre »), par exemple les or des thèmes (« --gold », « --gold-ink », « --gold-soft », « --gold-line »).
 *
 * Retirer la campagne, c'est vider l'objet : tout revient à ce qu'il était. Les jetons de la campagne sont écrits « !important » : ils l'emportent sur le thème ET sur la palette que le client a choisie, c'est leur raison d'être. Il n'y a PAS de catalogue de couleurs : une couleur de campagne se mesure (contraste du texte sur le fond dans les trois thèmes) avant d'entrer.
 *
 * Exemple, à ne pas laisser actif :
 *   export const CAMPAGNE: Campagne = {
 *     nom: "Rentrée",
 *     accents: { aide: "bleu" },
 *     marque: { or: "#2f7d5b", orSombre: "#7fd1a8" },
 *     jetons: { clair: { "--gold": "#2f7d5b" }, sombre: { "--gold": "#7fd1a8" } },
 *   };
 */
export type Jetons = Record<string, string>;
export type Campagne = {
  nom: string;
  accents?: Partial<Record<"instruments" | "trader" | "marche" | "aide" | "accueil", "or" | "bleu">>;
  marque?: Partial<Record<"or" | "orSombre" | "orVif", string>>;
  jetons?: { commun?: Jetons; clair?: Jetons; tamise?: Jetons; sombre?: Jetons };
};

export const CAMPAGNE: Campagne = { nom: "Aucune campagne" };

const NOM_DE_JETON = /^--[a-z0-9-]+$/;
const VALEUR_SURE = /^[#a-zA-Z0-9(),.%\s/-]+$/;

const bloc = (selecteur: string, j?: Jetons): string => {
  const lignes = Object.entries(j ?? {})
    .filter(([k, v]) => NOM_DE_JETON.test(k) && VALEUR_SURE.test(v))
    .map(([k, v]) => `${k}:${v} !important`);
  return lignes.length ? `${selecteur}{${lignes.join(";")}}` : "";
};

/** Le CSS d'une campagne : « :root » pour les jetons communs, « data-theme » pour les autres. Une campagne vide donne une chaîne vide. Un nom de jeton ou une valeur qui sortirait du cadre (accolade, point-virgule) est refusé en silence. */
export function cssDeCampagne(c: Campagne): string {
  const j = c.jetons;
  return [bloc(":root", j?.commun), bloc('html[data-theme="light"]', j?.clair), bloc('html[data-theme="dim"]', j?.tamise), bloc('html[data-theme="dark"]', j?.sombre)].filter(Boolean).join("");
}
