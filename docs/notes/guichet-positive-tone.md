---
name: guichet-positive-tone
description: "Guichet house style (2026-09-20) : say what Guichet does, never what it is not; no « ni conseil, ni promesse », « jamais recommandé », « ce qu'il n'est pas » headings"
metadata:
  type: feedback
---

The user asked (2026-09-20) to rephrase "Ni conseil, ni promesse" positively and to apply that tone through the whole app: lead with what Guichet does ("chaque chiffre est expliqué, la décision reste la vôtre", "le conseil, c'est votre conseiller qui vous le donne en vous rappelant") instead of what it is not.

**Why:** a client should read confidence and clarity, not a list of disclaimers; the regulatory disclaimer (`DISCLAIMER` in config, the "Communication à caractère promotionnel…" line) stays as the law wants it, but every heading, lead, hint and coach text is written in the positive.

**How to apply:** when writing UI copy, docs (`src/data/docs`), lessons, legal sections (`src/data/legal.ts`, bump `LEGAL_VERSION` when the text changes), presentation slides: no "n'est pas", "jamais", "ni … ni" as the main clause; state the positive rule and, if needed, who does the rest (the conseiller). Same in EN.

Related: [[guichet-no-em-dash]], [[guichet-docs-and-guides]]
