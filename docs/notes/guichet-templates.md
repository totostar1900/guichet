---
name: guichet-templates
description: Templates registry (desk › Référentiel › Modèles): passages catalogue vs server resolver, three sensitivities, three kinds, consultable models with previews for every DocumentType, "Dernier émis", other editions
metadata:
  type: project
---

Guichet templates registry, live since 2026-09-21, extended 2026-09-22.

- Client-safe catalogue `src/lib/documents/passages-catalog.ts` (PASSAGES, PLACEHOLDER_LABEL, SENSITIVITY_LABEL, fill, checkPassage, passage); server resolver `passages.ts` (`resolvePassages(type)` → {text, versions}); table `template_texts` (migration 0030), `documents.template_versions` on every generated PDF.
- Sensitivities: libre (in force on save), relu (another desk member), reglementaire (responsable). Kinds: signe / envoye / interne (`DOC_KIND`, `DOC_ORDER`, `DOC_ROLES`, `MOMENTS` in `src/lib/documents/registry.ts`).
- Every DocumentType has a preview (`renderPreview(type, override?, variant?)` in generate.ts; route `/desk/referentiel/modeles/preview?type=&v=|passage=&fr=&variante=opcvm`). bordereau (SVT demo auction lines / OPCVM with `variante=opcvm`) and dossier_svt render on demo data; their sentences are libre passages (bordereau: reglement_svt, execution_opcvm; dossier_svt: demande).
- Registry page shows "Dernier émis" per model from `listDocuments()`, a second preview button for bordereau, and an "Autres éditions" section (fiche PDF d'une ligne, rapport société, rapport d'activité: on-demand, not stored, preview links on a real line / company / period).
- Rule: a model without passages is consulted through its preview; wording changes for it go to the technical team.

**Why:** the desk asked to consult every model, including internal ones; previews + libre passages give that without new DocumentTypes.
**How to apply:** new DocumentType ⇒ add DOC_LABEL/PREFIX/KIND/ROLES/WHEN, a preview branch in renderPreview, passages if any, EN keys. See [[guichet-referentiel-drafts]], [[guichet-docs-and-guides]].
