---
name: guichet-boc-parser
description: Guichet bulletin reader (2026-09-23): pre-Nov-2025 layout split an equity row over three lines, the reassembly window only joined two, 31 sessions had no prices; window now 4, capitalisation silence now warns, 77 bulletins re-ingested, Santé › Bulletins à relire closes the loop
metadata:
  type: project
---

`parseBoc` (`src/lib/market/boc-parse.ts`) rebuilds an equity row from the lines that follow its ISIN. Until November 2025 the BVMAC PDF emitted previous close, session date and the rest of the row as three separate lines; today it glues them into one. The window was `k <= 2`, so the candidate carried the date without the row and the parser emitted « ligne dense non reconnue ». It is now `k <= 4`. A capitalisation section that is present but yields no rows now pushes a warning (18 sessions lost it silently). Regression test: `boc-parse-legacy.test.ts` against fixture `BOC-20250903.txt` (BOC 2335).

**Why:** found while testing the index weighting rule — 31 sessions had zero equity quotes, which broke the reconciliation. The reader had flagged every one of them `partiel` at ingest time; nothing surfaced the backlog, so nobody acted for a year.

**How to apply:** a repaired reader does not heal the past. After any parser fix, re-read the affected bulletins from **Santé › Bulletins à relire** (`/desk/sante#relire`): `bulletinsToReread()` in `src/lib/health.ts` lists every bulletin whose status is not `ok` or that has no equities, `rereadAction` re-reads six at a time (or one by date) through `ingestBoc` using the `source_url` stored on each bulletin. `ingestBoc` already refuses to overwrite a newer price (`lastPriceOn > sessionDate`), so re-reading old bulletins is safe. Only 6 of 264 PDFs are kept locally, so re-reading depends on the BVMAC site; `ingestBoc` takes `keepPdf`. Related: [[guichet-index-bvmac]], [[guichet-notes-de-marche]].
