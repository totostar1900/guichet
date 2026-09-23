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

**Ce que la plateforme a le droit d'affirmer** (2026-09-23). Trois décisions de la même soirée ont tranché dans le même sens : la note trimestrielle dit « méthodologie en cours de confirmation » plutôt que de conclure ; `indexCheck` dit « séance à éclaircir » plutôt que « la BVMAC se trompe » ; et une ligne sortie de la cote lit « Clôturée » plutôt que « remboursée à l'échéance », que nous n'avons pas observé, ou « retirée du Guichet », qui est faux. La règle : **la plateforme dit ce qu'elle a lu, nomme ce qu'elle a inféré, ne promeut jamais une inférence en fait sur l'argent d'un client, et ne décrit jamais la conduite d'un tiers sur la foi de nos propres instruments.** Ce que nous ne pouvons pas soutenir en public, le desk l'instruit en privé : l'observation, sa provenance et le nombre de porteurs vont dans Santé, pas sur la fiche publique. Raison concrète : nos lectures ont produit 31 séances sans cours pendant un an sans que rien ne le dise, donc une affirmation bâtie sur notre lecteur ne vaut pas mieux que le lecteur.
