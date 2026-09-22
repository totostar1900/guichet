---
name: guichet-notes-de-marche
description: Guichet market notes on the BVMAC index (2026-09-22): quarterly note public (page + PDF), monthly note desk-only; both from index-quarter.ts / index-note.ts, published from /desk/indice, documented in docs/notes-de-marche.md + /desk/docs/publications
metadata:
  type: project
---

Two notes, one document type (`note_indice`, prefix IDX, migration 0033). **Quarterly = public**: page `/indice/note/<trimestre>` (src/app/indice/note/[trimestre]), PDF at `/pdf` (`src/lib/documents/pdf/quarter-templates.tsx`), computed by `src/lib/market/index-quarter.ts` (`quarters`, `quarterNote`) from that quarter's sessions only, so a closed note never changes; number `PC-IDX-2026T2`; cron `/api/cron/note-trimestre`, `0 7 5 1,4,7,10 *`. **Monthly = desk only**: `src/lib/market/index-note.ts`, number `PC-IDX-202608`, cron `/api/cron/note-indice`, `40 6 3 * *`. Both crons are idempotent (they check the number first) and send nothing. Desk › Indice (`/desk/indice`) shows the quarterly block first, then the monthly one with the "séances à éclaircir" table. The `portee` passage comes from Référentiel › Modèles (rule relu).

**Why:** the user judged the monthly note unnecessary for clients (the market trades too rarely to have something to say every month) and asked for a quarterly, public, client-oriented page with a PDF download, plus an internal maintenance document for the desk team.

**How to apply:** publishing does not open the page (it is computed on demand, a running quarter is already readable); publishing freezes the PDF into Documents with its number and passage versions. Share the page link, not the file. The reconciliation gaps (65 moving sessions, only 12 reconcile) stay desk-side: the public note reduces them to the one `methodOpen` line until the BVMAC methodology note arrives. Maintenance doc: `docs/notes-de-marche.md` and its in-app twin `src/data/docs/publications.ts` (`/desk/docs/publications`) — keep both in step. Related: [[guichet-index-bvmac]], [[guichet-templates]], [[guichet-docs-and-guides]].
