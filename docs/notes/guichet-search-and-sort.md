---
name: guichet-search-and-sort
description: "Guichet conventions for searching, sorting and capping long tables (people search shared by two pages, column sorting, draft-then-URL search, TallTable 20 rows)"
metadata:
  node_type: memory
  type: project
  originSessionId: b2709f29-0ead-485f-9c72-4137a89e837c
  modified: 2026-09-24T15:02:00.968Z
---

Four conventions settled on 24 September 2026, all in force across Guichet.

**One people search, two pages.** `src/lib/search/people.ts` is the single matcher for the Dossiers left pane (`src/lib/kyc/queue.ts`) and the Répertoire. Rules: accent- and case-insensitive; **every** typed word must match (not any), so a second word narrows; a token made of digits is compared against the phone reduced to its digits (« 699 88 » finds « +237 699 88 77 66 »). Keywords `palier:` `canal:` `dossier:` `ordres:` (and the EN aliases) do from the field what the chips do from the bar; an unrecognised keyword is named under the field instead of silently returning nothing; anything that looks like a keyword but is not (an immatriculation with a colon) stays a word. Tests: `src/test/people-search.test.ts`, `src/test/file-queue.test.ts`.

**The Dossiers left pane is the directory again.** It carries everyone in rows of a name plus phone · e-mail, separated by a 1px rule, the pane scrolling on its own; what waits keeps a gold dot and the page order puts it first. This reverses the earlier « file de travail » design, on the user's call: « ouvre-moi untel » is the question the desk actually asks. « mis à jour » moved to the detail head.

**Sorting is taken from the column header**, not a sort box: each column opens in its natural direction (a return highest first, a name A to Z), a second click reverses, and the sort box survives only in the phone sheet where there are no columns. Done on guichet/fonds (`FundsBrowser`, `NATURAL` map, `pickSort`) and on the desk order book (`sortTh` as a **function**, never a component declared in render, which the React Compiler lint refuses).

**A search field leads, the URL follows.** Writing to the URL on every keystroke re-ran the whole page between two letters. The field keeps a local `draft`, the list filters on it at once, and `router.replace` follows after 180 ms (with an effect that re-syncs when the URL changes without us: back button, shared link). Measured on the production build afterwards: 20 to 31 ms per keystroke; the ~1 s seen in `next dev` is dev-mode React, not the app.

**A long table shows 20 rows, measured not guessed.** `src/components/desk/TallTable.tsx` measures the 21st row and caps the box just before it, leaving a sliver showing; « Tout afficher » returns the full height. Sticky headers need `border-collapse: separate` on the table (collapse attaches the rules to the table, so they paint over a sticky header and rows seem to pass through it) : see `.feedTable` and `.box`.

See [[guichet-desk-gap]] for the spacing scale these use, [[guichet-issuers-fiche]] for the fund pages themselves.
