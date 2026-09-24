---
name: guichet-numbers-and-marks
description: "Guichet conventions for showing amounts, the order form's cashflow section, the fiche header marks, and what actually made the phone feel slow"
metadata:
  node_type: memory
  type: project
  originSessionId: b2709f29-0ead-485f-9c72-4137a89e837c
  modified: 2026-09-24T20:25:41.558Z
---

Settled 24 September 2026, from a phone review.

**Amounts.** `src/components/Amount.tsx` is the one way to print a figure: grouped thousands (`fmt`, French narrow no-break space), tabular, and the unit in a `<small>` at about 0.6 em in muted ink. At the number's own size, « FCFA » takes as much width as the million beside it and pushes it to a second line on a phone. Use it everywhere an amount appears with a unit.

**Amount fields group while you type.** `src/lib/ui/grouped.ts` (`groupedInput`, `regroup`, `groupDigits`). The hard part is the caret: reformatting on each keystroke replaces the value and sends the caret to the end, so the helper counts the digits before it, reformats, and restores it after the same count. Never use `type="number"` for an amount, it cannot group. Guard: `src/test/grouped.test.ts`, whose real assertion is that `parseAmount`/`parseUnits` read back what the field shows.

**The reference block's conclusion.** The two totals and the yield left the calculation grid for a band underneath (`src/components/RefTotals.tsx`): the grid keeps the path, the band carries the answer; the rate sits below the francs rather than beside them, because it is not the same kind of number.

**The order's cashflow section** (`OrderFlows`) is a real button with a chevron, not a `<details>`: the CSS sets `display: flex` on the summary, which removes WebKit's native marker. It switches table / chart, **table first**, and the chart is the fiche's own `FlowsChart`, which now accepts bare `flows` + `outlay` as well as a full `BondResult`. `orderPlan()` computes flows, outlay and settlement date in one place.

**The fiche header** carries two round marks and the PDF: the star (`WatchButton`, filled when followed), the `···` (now a disc: a surface and a hairline ring), and `HorizonMark`, a round icon that opens a sheet. Comparer left the header; it lives in the `···` and in the sticky bar, where it now has the action's height and a real outline. **`HorizonMark` also shows when the client has no profile** (`profileFlag` returns null then, so they used to see nothing at all) and offers the seven-question test.

**What made the phone feel slow was not the swipe.** `SwipePager` already prefetches both neighbours. It was the render: `listOffers()` ran three times per fiche plus once in the layout, and `listIntents()` in full for a signed-in reader. See [[guichet-search-and-sort]] for the sibling lesson; the fix is `src/lib/data/memo.ts`, one read per request, and a `loading.tsx` so the gesture lands on a skeleton. Measured on the production build from this machine: funds list 610 → 484 ms, anonymous fiche 1054 → 1007 ms. The remaining second is data volume (whole offers table, 2000 NAV rows), still open.

**The test suite caps its workers** (`maxWorkers: "50%"` in vitest.config.mts). With fifty files, several parsing real PDFs, one process per file starves each of CPU and slow tests hit the timeout with nothing broken. Capped, the suite finishes in about 25 seconds.
