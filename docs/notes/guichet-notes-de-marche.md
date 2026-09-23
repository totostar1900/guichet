---
name: guichet-notes-de-marche
description: Guichet market notes on the BVMAC index (2026-09-22): quarterly note public (page + PDF), monthly note desk-only; both from index-quarter.ts / index-note.ts, published from /desk/indice, documented in docs/notes-de-marche.md + /desk/docs/publications
metadata:
  type: project
---

Two notes, one document type (`note_indice`, prefix IDX, migration 0033). **Quarterly = public**: page `/indice/note/<trimestre>` (src/app/indice/note/[trimestre]), PDF at `/pdf` (`src/lib/documents/pdf/quarter-templates.tsx`), computed by `src/lib/market/index-quarter.ts` (`quarters`, `quarterNote`) from that quarter's sessions only, so a closed note never changes; number `PC-IDX-2026T2`; cron `/api/cron/note-trimestre`, `0 7 5 1,4,7,10 *`. **Monthly = desk only**: `src/lib/market/index-note.ts`, number `PC-IDX-202608`, cron `/api/cron/note-indice`, `40 6 3 * *`. Both crons are idempotent (they check the number first) and send nothing. Desk › Indice (`/desk/indice`) shows the quarterly block first, then the monthly one with the "séances à éclaircir" table. The `portee` passage comes from Référentiel › Modèles (rule relu).

**Why:** the user judged the monthly note unnecessary for clients (the market trades too rarely to have something to say every month) and asked for a quarterly, public, client-oriented page with a PDF download, plus an internal maintenance document for the desk team.

**The full paper** (2026-09-23): the first version carried the content but not the layout, and the user said so. The page is now seven sections in two columns with a sticky technical margin, four server-rendered SVG figures in `src/app/indice/note/[trimestre]/Figures.tsx` (index curve with the peak session annotated, monthly bars, paired weight bars global/float, contribution bars), the analytical sections (what the index does well, concentration, what it says about the regional economy) and a Méthode box. The PDF mirrors it in `quarter-templates.tsx` with react-pdf `Svg` (7 pages). Extra data on `QuarterNote`: `points`, `peak`, `stats` (avg, sd, volAll, volMoved, drawdown + dates), `financePct`, and `holderPct` on each line.

**How to apply:** publishing does not open the page (it is computed on demand, a running quarter is already readable); publishing freezes the PDF into Documents with its number and passage versions. Share the page link, not the file. The reconciliation gaps (65 moving sessions, only 12 reconcile) stay desk-side: the public note reduces them to the one `methodOpen` line until the BVMAC methodology note arrives. Maintenance doc: `docs/notes-de-marche.md` and its in-app twin `src/data/docs/publications.ts` (`/desk/docs/publications`) — keep both in step. Any sentence the note writes must follow its own figures: the volatility sentence and the shareholding sentence are conditional because a fixed wording contradicted the data on the first quarter tested. Related: [[guichet-index-bvmac]], [[guichet-templates]], [[guichet-docs-and-guides]].

## Naviguer entre les trimestres (23 septembre 2026)

La liste plate des autres trimestres tenait tant qu'il y en avait trois. À quatre
par an, elle compte vingt entrées en 2031, dans une colonne de 196 px, et serait
la plus haute chose de la page. Sur téléphone elle était pire : au pied d'un
article de 9 000 px, soit 87 % plus bas que l'endroit où on la cherche.

- `QuarterStepper` (`src/components/QuarterStepper.tsx`) : le trimestre d'avant,
  celui qu'on lit, celui d'après, et « Toutes les notes (n) ». Même hauteur pour
  toujours. `wide` au pied de l'article, abrégé ailleurs.
- Trois surfaces, trois moments : le rail collant sur ordinateur (toujours en
  vue), le pied de la feuille « Sur cette page » sur téléphone (un tapotement
  depuis n'importe quelle hauteur), et la fin de l'article pour qui vient de le
  finir.
- `PageOutline` accepte un `foot` que `SectionLine` pose sous « Haut de page » et
  « Section suivante » : n'importe quelle page peut ajouter sa rangée au bas de
  sa feuille, ce n'est pas propre à la note.
- `/indice/notes` : l'archive, par année, avec variation, niveau et séances avec
  mouvement. Elle est la condition du pas à pas : un contrôle de taille fixe
  n'est honnête que si la série entière se voit quelque part. `quarterGlance()`
  (`src/lib/market/quarter-glance.ts`) la calcule sans écrire vingt notes.
- `MARKET_PAGES.notes` pointe désormais vers `/indice/notes` et non vers l'ancre
  `/indice#notes`.

### Le piège des clefs à trous

Une clef du dictionnaire qui contient `{n}` devient une expression régulière.
« T{n} {y} » compilait en `^T(.+?) (.+?)$` et traduisait « Trésor public de la
République du Congo » en « Qrésor public… ». Le dictionnaire porte 466 clefs à
trous et aucune ne descendait sous deux lettres fixes ; `src/test/i18n.test.ts`
tient ce plancher et compte à part les six plus courtes, qui peuvent diminuer
sans jamais se multiplier. L'abréviation d'un trimestre se compose désormais en
code, à partir de `getLang()`.

Un second piège, plus banal : « points » était déjà traduit par « dots » pour les
marqueurs d'un graphique. La clef est maintenant « {n} points d'indice ».
