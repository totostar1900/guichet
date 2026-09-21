---
name: guichet-templates
description: Templates registry (three kinds, 15 models incl. mandat/coupon/réclamation/transfert since 2026-09-21 evening) with versioning (desk › Référentiel › Modèles) built 2026-09-21; passages catalogue vs server resolver split, sensitivities, migration 0030 status
metadata:
  type: project
---

Templates registry (built 2026-09-21): what generated documents say is edited from the desk, passage by passage, at `/desk/referentiel/modeles`. Catalogue + client-safe helpers live in `src/lib/documents/passages-catalog.ts` (PASSAGES, PLACEHOLDER_LABEL, SENSITIVITY_LABEL, fill, checkPassage, passage); the server resolver `resolvePassages` (reads the repo, tolerates a missing table) is in `src/lib/documents/passages.ts`, which re-exports the catalogue. Three sensitivities: libre (in force on save), relu (another desk member than the author activates), reglementaire (responsable approves). Statuses current / pending / superseded; `documents.template_versions` records which versions each PDF carried. Preview route `/desk/referentiel/modeles/preview?type=&v=|passage=&fr=` renders on demo data, desk only. Client editor exports `PassageEditor` and `ActivateVersion` (a static property on a client function is NOT visible from a server component; use named exports).

**Why:** the desk must reword documents without a deploy, with a review trail, and issued PDFs must never change retroactively. Layout, figures and new document types stay in code.

**How to apply:** add a passage with `P(...)` in the catalogue and call `passage(docType, key, texts, vars)` in the PDF template; never import `@/lib/data` from the catalogue (client bundle). Migration `0030_template_texts.sql` applied on Supabase 2026-09-21 (see [[guichet-supabase-migrations]]). Related: [[guichet-issuers-fiche]], [[guichet-docs-and-guides]].


**Acts and notices (2026-09-21 evening):** DocumentType gained mandat · coupon · reclamation · transfert; KycStatus gained en_cloture · clos; ClientFile.acts holds mandates and the closure; GeneratedDocument.flowKey (client|isin|date) makes coupon notices unique; Position.paid lists flows already due. Registry lists DOC_ORDER in three kinds (DOC_KIND / DOC_KIND_LABEL / DOC_KIND_RULE / DOC_WHEN in registry.ts). Desk actions in src/app/desk/clients/acts-actions.ts (mandateAction, couponNoticeAction, couponBatchAction, transferAction, closureStepAction, complaintDeskAction), panel ClientActs.tsx; client complaint at /moi/reclamation (code on proven WhatsApp, else the signed-in e-mail). notifyClientDocument sends a client document without an intention. Decisions taken: mandate never lets funds out to the agent; notices only go by a proven channel; complaint signed by code; « en clôture » refuses new intentions (submitIntent checks session.kycStatus). Migration 0032 (enum adds + flow_key + acts).
