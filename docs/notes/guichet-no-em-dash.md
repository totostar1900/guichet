---
name: guichet-no-em-dash
description: "User rule for Guichet: no em-dash punctuation anywhere (code comments, UI strings, docs, notes); how it was applied and what stays"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8ecfdc15-a97a-41f6-a140-c3c9f48a4903
  modified: 2026-09-19T01:35:27.381Z
---

No em dashes as punctuation in Guichet: not in code comments, not in French or English content, not in docs or working notes (user asked 2026-09-19: "remove all emdash punctuations from comments and content").

**Why:** the user's house style; a sweep of 195 files was needed once and should not be needed again.

**How to apply:** write a colon for a lead or an explanation ("Comment lire : …", "Solidité : fonds propres…"), commas or parentheses for an aside, a middle dot (·) for structural separators in names and labels (SVT names, "VL · dépositaire"). The lone dash character that stands for a missing value in a table cell stays (it is a symbol, not punctuation), and the glossary's mention of that symbol too. Never split code on a spaced dash again: company comments split on " : " (short lead only), the search's definition titles on " : ", SVT names on " · ". The sweep script is scratchpad/dedash.mjs (one spaced dash becomes a colon, two or more become commas, a dash before a comma disappears). Do not run it over this memory folder again. See [[guichet-project]].
