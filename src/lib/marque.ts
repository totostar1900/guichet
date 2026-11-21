/**
 * LES TROIS OR DE LA MAISON, ÉCRITS UNE FOIS (21 novembre 2026, « ramener les 23 littéraux au catalogue sans changer leur couleur »).
 *
 * Ces trois valeurs étaient écrites en dur dans vingt-trois endroits : la barre du haut, les PDF, l'e-mail de notification, les définitions de palette, la couleur de la zone CEMAC, le dégradé des statuts, un dessin de la présentation. Elles vivent ici. Le TypeScript (PDF, e-mail, palettes, données, SVG) les lit directement ; le CSS les lit par trois jetons que la mise en page pose sur « :root » (« --marque-or », « --marque-or-sombre », « --marque-or-vif ») : une seule source, deux langues.
 *
 * AUCUNE COULEUR N'A CHANGÉ : ce sont les valeurs exactes qui étaient écrites. Changer l'une d'elles change la barre du haut, les PDF, les e-mails et les palettes à la fois. Les or des THÈMES (« --gold », « --gold-ink », « --gold-soft ») restent dans « globals.css » : ce sont les jetons du thème, qui se règlent par thème.
 *
 * Un fichier qui écrirait de nouveau un de ces or en dur est refusé par « marque.test.ts ».
 */
export const MARQUE = {
  /** L'or de la marque sur fond clair : PDF, palettes, couleur de la zone CEMAC, trait de la présentation. */
  or: "#b8860b",
  /** L'or de la marque sur fond sombre : barre du haut, onglet courant, étiquette des PDF. */
  orSombre: "#e0b65a",
  /** L'or vif de la barre du haut sur mobile et du dégradé des statuts. */
  orVif: "#e2b94c",
} as const;

/** Les trois jetons CSS, posés sur « :root » par la mise en page : une seule source pour le TypeScript et pour les feuilles de style. */
export const MARQUE_CSS = `:root{--marque-or:${MARQUE.or};--marque-or-sombre:${MARQUE.orSombre};--marque-or-vif:${MARQUE.orVif}}`;
