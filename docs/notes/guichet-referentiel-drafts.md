---
name: guichet-referentiel-drafts
description: Référentiel drafts → Publier / Abandonner (2026-09-21), Santé cards as links with the « Depuis Santé » strip, health-how table; migration 0031
metadata:
  type: project
---

Since 2026-09-21 every référentiel save is a draft on the `reference` row (`draft` jsonb = `{op:"set",data}` or `{op:"reset"}`, `draft_by`, `draft_at`; `data` nullable for never-published entries). Loaders in `src/lib/reference.ts` read only `data != null`. Repo methods: `saveReferenceDraft`, `publishReference(kind, keys?)`, `discardReference(kind, keys?)`; `upsertReference` stays for the approval policy. Page `src/app/desk/referentiel/page.tsx` overlays drafts (`seen()`), shows the draft bar, flashes `?ok=` / `?publie=`; `RowActions.tsx` (reset with confirm, publish, discard), `Origin.tsx`, `TermsTable.tsx` (client filter/sort + "sans échéancier" strip with `?nouveau=ISIN`). Server actions redirect to the list after a save (`done()`); « Importer les valeurs par défaut » was removed (it only seeded missing keys, never reset).

Santé: `src/lib/health-how.ts` (client-safe) maps each check key to href + one-line how + docs anchor; orange/red cards are links carrying `?depuis=sante&point=<key>` (query before the #anchor); target pages render `<FromSante point=…/>` (`src/components/desk/FromSante.tsx`). Filters added: `/desk/marche?filtre=sans-cours`, `/desk?filtre=sans-prix#offres`, `/desk/reporting?vue=fermes|executes#journal`.

**Why:** the user wanted "publish / cancel all" on the référentiel and actionable Santé cards; a permanent "how-to" badge on every page was rejected in favour of the contextual strip.

**How to apply:** a new Santé check needs an entry in HEALTH_HOW and, if its target page lacks it, the FromSante strip + a filter. Migration 0031 must be applied before the desk saves anything (see [[guichet-supabase-migrations]]). Related: [[guichet-templates]].
