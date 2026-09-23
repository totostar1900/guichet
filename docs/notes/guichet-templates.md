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

## Les messages préparés au même registre (24 septembre 2026)

Le registre des modèles accepte désormais une clef qui n'est pas celle d'un
document : `"message"`. `TemplateScope = DocumentType | "message"`, et
`doc_type` était déjà du texte libre dans la migration 0030, donc **aucune
migration**.

- `src/lib/documents/messages-catalog.ts` : huit `MessageDef extends PassageDef`
  (accuse, documents, compte, provision, echeance, relance, appel, autre), tous
  `relu`, avec `when?: IntentState[]` (l'ordre d'apparition selon l'état) et
  `askNote?` (la précision que l'opérateur doit écrire).
- `src/lib/documents/messages.ts` : `preparedMessages(state, vars, lang)`
  remplit tout **sauf** `{precision}`, qui appartient à l'écran.
- `Compose.tsx` sur `/desk/intentions/[id]` : les deux liens nus « Répondre
  sur WhatsApp / par e-mail » ont laissé la place au composeur, qui porte les
  deux canaux et marque celui que le client a demandé. Un champ resté à remplir
  bloque l'ouverture (`/\{[a-z_]+\}/` sur le corps), et corriger le texte à la
  main lève le blocage.
- `notePreparedMessage` (message-actions.ts) écrit dans le fil de l'ordre que
  le message a été **ouvert** : l'application ne l'envoie pas et ne le prétend
  pas. Le texte de l'opérateur passe par `escapeHtml` (nouveau dans
  format.ts) ; les autres `logEvent` du desk interpolent encore du texte brut.

Registre : `/desk/referentiel/modeles?type=message`, quatrième groupe du rail,
sans aperçu PDF ni « Dernier émis ». Garde : `src/test/messages.test.ts`.
Commit 5477ed2.
