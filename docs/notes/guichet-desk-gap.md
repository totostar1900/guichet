---
name: guichet-desk-gap
description: Desk pages share one 42px gap under the desk bar (DeskNav margin-bottom); no page adds its own top margin; sanctions pre-check without provider shows manual lists
metadata:
  type: feedback
---

On 2026-09-22 the user asked to harmonise the space between the « Pilotage » desk bar and every page's content, left and right panes level.

**Why:** the docs reader had grown its own 42px offsets (outline, then article) while every other desk page sat 14px under the bar; the user wants one line for all content.
**How to apply:** the gap lives once in `src/components/DeskNav.module.css` (`.nav { margin-bottom: 42px }`); never add a top margin/padding to a desk page's first block or a pane. Panels keep their own inner padding. Also: without OPENSANCTIONS_API_KEY the review form shows the public lists (MANUAL_LISTS in `src/lib/kyc/screening.ts`) instead of the pre-check button; never show env-var names to the desk. See [[guichet-docs-and-guides]].

## L'échelle d'espacement (23 septembre 2026)

Les couleurs et la typographie étaient déjà nommées dans `globals.css` ; les
espaces ne l'étaient pas. Mesure : 1893 déclarations d'espacement dans
`src/**/*.css`, 35 valeurs distinctes, mais 76 % sur six pas seulement
(8 · 10 · 6 · 4 · 12 · 2). L'échelle existait, personne ne l'avait écrite.

Trois défauts trouvés en mesurant dans le navigateur, pas en lisant le code :

- `.panel` n'avait aucun retrait intérieur. Sur 87 panneaux, ceux dont le contenu
  ne s'était pas inventé le sien tenaient à 1 px du filet, seize pixels à gauche
  de leur propre en-tête.
- `.tbl` posait ses cellules à 14 px quand `.panel-h` posait 16 : deux pixels
  d'écart sur toute la hauteur de chaque table du desk.
- Vingt et une feuilles avaient rattrapé le retrait à la main, et vingt d'entre
  elles avaient choisi 16 px. La convention était unanime et non écrite.

Ce qui est en place :

- `--s-1` à `--s-11` (2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32 · 40 px) et
  `--panel-inset` dans `src/app/globals.css`.
- Le panneau donne le retrait horizontal à son corps, par un sélecteur de
  spécificité nulle (`:where(.panel) > :where(:not(…))`) pour qu'une page qui dit
  autre chose gagne sans se battre ; plus le haut et le bas aux seules
  extrémités, jamais entre deux frères (deux sources d'espace s'additionnent).
- Onze feuilles qui ne servaient qu'à être un corps de panneau ne posent plus que
  leur vertical, avec `padding-block`. Les dix autres classes servent aussi
  ailleurs et gardent leur retrait.
- `src/test/spacing.test.ts` : un cliquet. 574 valeurs hors échelle au jour où
  l'échelle a été nommée, dont 310 aux deux pas hérités de 14 et 18 px. Le compte
  peut descendre, pas monter. Aucune réécriture en bloc n'est demandée.
- Documenté dans `src/data/docs/technique.ts` (chapitre « échelle ») et dans
  OPERATIONS.md § 6.

Pourquoi un test et pas seulement une note : écrire la convention ne suffit pas.
Le lecteur de bulletins a signalé soixante lectures partielles pendant un an sans
que personne n'agisse, parce que rien n'échouait.

Harmoniser n'est pas uniformiser : le desk se balaie et prend les petits pas, une
note de marché se lit et prend les grands. La même échelle, pas les mêmes degrés.
