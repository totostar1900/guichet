---
name: guichet-issuers-fiche
description: Issuer registry (one entity behind spellings, CEMAC zone, sourced text, silent gaps), fiche panes Essentiel·Chiffres·Documents·Émetteur, intention on its own page; decided 2026-09-21
metadata:
  type: project
---

Since 2026-09-21: `src/data/issuer-registry.ts` = classification layer over lines (BOC data untouched): `resolveIssuer(o)` by ISIN → alias (accent/suffix-normalised) → label prefix; `issuerKey` drives list grouping/sorting; `issuerZone` gives "CEMAC" for BDEAC/BEAC (flag `.cc.cemac`). Fiche panes: Essentiel · Chiffres · Documents · Émetteur (Risques removed, one link to lesson `les-quatre-risques`); `IssuerCard.tsx` sovereign vs corporate shape. Intention page `/offres/[id]/intention` (`intent-context.ts` shared loader, `Kpis.tsx` shared); phone CTA, card pulls and desk links point there; desktop keeps the side column (hidden on phone).

**Why:** the user wants one structure per line kind, no invented data, no "non communiqué" badges (they worry clients), risk is generic and belongs in the Guide.
**How to apply:** add issuers to the registry (STATES/REGIONAL) or to companies.ts/issuers.ts; never surface a missing-value badge to clients; keep bulletin labels verbatim. Mockup: https://claude.ai/artifact/QpZRQvMK9unFtJRWZ1zgEJ. See [[guichet-phone-ux]], [[guichet-companies-data]].
