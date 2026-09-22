---
name: guichet-document-refs
description: Guichet client-visible references (2026-09-22): documents and intentions both print an opaque ref, the sequence moves to an internal register_no / order journal; counterparty docs stay sequential; migrations 0034 and 0035
metadata:
  type: project
---

`src/lib/documents/numbering.ts` (`nextNumbers`, `registerOf`, `isSequentialRef`) returns two references. `GeneratedDocument.number` is what the PDF prints and the client quotes; `GeneratedDocument.registerNo` (column `documents.register_no`, migration 0034, applied 2026-09-22) is the firm's log. Client documents (DOC_KIND signe + envoye) get `PC-<PREFIX>-<yymmdd>-<4 chars>` from the alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ` (no I, L, O, U, 0, 1, so it spells over the phone); counterparty documents (DOC_KIND interne: bordereau, dossier_svt) keep the sequence as their printed reference; `note_indice` keeps its period reference (`PC-IDX-2026T2`), which is what makes the cron idempotent. The register is computed from `max(seq)+1` over existing entries, never `rows.length+1`. Desk › Documents has a `?q=` box matching either reference, and shows the register entry under the printed one. Documented in `src/data/docs/documents.ts` chapter `references`; tested in `src/test/numbering.test.ts`.

**Why:** the user noticed that `PC-AF-2026-0002` tells a client it is the second funding call of the year, and two documents weeks apart give away the rate. Decision taken: client documents opaque, counterparty documents sequential.

**Intentions, same split** (migration 0035, applied 2026-09-22): `makeRef(type, now)` in `src/lib/data/repository.ts` now returns `PF-0914-K7Q4` (same alphabet) and `makeOrderNo(seq)` writes `intents.register_no` = `PC-ORD-000018` from the existing `intent_seq`. The intention ref is the widest-seen identifier in the app: acknowledgement, order form, My space, and the client's bank transfer reference. The desk sees the journal entry on the intention page and in the first column of the exported order journal (`OrderRow.registerNo`). A duplicate ref is redrawn; a missing column degrades gracefully like the other migrations.

**The rest of the sweep** (2026-09-22, nothing to change): offer ids are descriptive slugs; `/offres/<id>/doc/<n>` numbers within one line; files, documents, accounts and positions use random ids; the custodian sub-account number is assigned by the SVT; the only other DB sequence is `audit.id` (bigserial), desk-only.

**How to apply:** a reference already in a client's hands never changes, so documents issued before 2026-09-22 keep theirs and `registerOf()` falls back to `number` for them. Never print `registerNo` on a client copy. The sweep of client-visible identifiers is done; if a new one is introduced, check it carries no rank before it reaches a client. Related: [[guichet-templates]], [[guichet-supabase-migrations]], [[guichet-notes-de-marche]].
