---
name: guichet-fund-numbers
description: "What the fund figures mean in Guichet (12 months is a change not a rate, origine has two meanings, the annualised return, where the formula lives)"
metadata:
  node_type: memory
  type: project
  originSessionId: b2709f29-0ead-485f-9c72-4137a89e837c
  modified: 2026-09-24T15:02:10.691Z
---

Audited and corrected on 24 September 2026, after the question « is 12 months annualised ? ».

**« Performance sur 12 mois » is a change, not an annual rate**: `perf1y()` in `src/lib/market/boc.ts` takes the closest NAV published **before** the anniversary, tolerating up to 45 days, so the figure can span 365 to 410 days. The KPI card now names both dates and the number of days actually covered.

**« Origine » meant two different things on the same page**: the KPI uses the bulletin's `inceptionDate` (the fund's creation) while the chart button resolved to the first NAV we ever stored. The button now reads « Tout l'historique » and the line under the chart says « depuis notre première VL lue, pas depuis la création du fonds ».

**« fenêtre » is not the period**: the period picks the dates shown, the window picks what each date measures (a 12-month window plots, at each date, the return of the twelve months before it). The control is labelled « fenêtre de calcul » with a title that says it.

**The annualised return lives once**, in `src/lib/domain/fund-perf.ts` (`fundAnnualPct`, `fundYears`) : it was copied in `summary.ts` and in `/comparer`. It only appears past six months of life, otherwise a quarter would be extrapolated over a year. It shows as a KPI card on the fund sheet and as the « Par an » column of desk › Marché › OPCVM.

See [[guichet-search-and-sort]] for the sorting and grouping added to those same tables.
