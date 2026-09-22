---
name: guichet-document-refs
description: Guichet document references (2026-09-22): printed ref is opaque for client documents (PC-BUL-260922-K7Q4), internal register_no keeps the sequence (PC-BUL-2026-0018); counterparty docs stay sequential, note_indice keeps its period; migration 0034
metadata:
  type: project
---

`src/lib/documents/numbering.ts` (`nextNumbers`, `registerOf`, `isSequentialRef`) returns two references. `GeneratedDocument.number` is what the PDF prints and the client quotes; `GeneratedDocument.registerNo` (column `documents.register_no`, migration 0034, applied 2026-09-22) is the firm's log. Client documents (DOC_KIND signe + envoye) get `PC-<PREFIX>-<yymmdd>-<4 chars>` from the alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ` (no I, L, O, U, 0, 1, so it spells over the phone); counterparty documents (DOC_KIND interne: bordereau, dossier_svt) keep the sequence as their printed reference; `note_indice` keeps its period reference (`PC-IDX-2026T2`), which is what makes the cron idempotent. The register is computed from `max(seq)+1` over existing entries, never `rows.length+1`. Desk › Documents has a `?q=` box matching either reference, and shows the register entry under the printed one. Documented in `src/data/docs/documents.ts` chapter `references`; tested in `src/test/numbering.test.ts`.

**Why:** the user noticed that `PC-AF-2026-0002` tells a client it is the second funding call of the year, and two documents weeks apart give away the rate. Decision taken: client documents opaque, counterparty documents sequential.

**How to apply:** a reference already in a client's hands never changes, so documents issued before 2026-09-22 keep theirs and `registerOf()` falls back to `number` for them. Never print `registerNo` on a client copy. If another client-visible identifier turns out to be sequential (intention refs, `/offres/<id>/doc/<n>`, statement numbering), it has the same leak and should get the same treatment. Related: [[guichet-templates]], [[guichet-supabase-migrations]], [[guichet-notes-de-marche]].
