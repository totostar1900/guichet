# Memory index

- [Guichet project](guichet-project.md) — C:\dev\guichet, live on Vercel + Supabase; governance layer (référentiel, rôles+MFA, audit, approbations, intake) done 2026-09-16
- [Docs, guides and tours](guichet-docs-and-guides.md) — in-app docs (src/data/docs, /desk/docs, /info/aide public only + sensitivity test), guide shots script, TOUR/CoachMarks conventions
- [Push after each step](guichet-push-after-each-step.md) — commit + push to origin master automatically for Guichet
- [Companies data](guichet-companies-data.md) — 7 BVMAC issuers in companies.ts; scanned PDFs rendered with scripts/pdf-pages.mjs
- [Bond terms source](guichet-bond-terms.md) — BVMAC fiches signalétiques (JPG) → src/data/bond-terms.ts; Congo (EOCG) missing
- [Supabase migrations](guichet-supabase-migrations.md) — applied via Chrome SQL editor with window.monaco setValue; enum adds run alone; 0001–0025 applied (0023 funds open, 0024 inbox, 0025 news)
