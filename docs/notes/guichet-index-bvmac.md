---
name: guichet-index-bvmac
description: BVMAC All Share Index in Guichet (2026-09-22): shown and explained (pulse, company page, Comparer, Santé check, lesson, desk doc), never built nor used as a client benchmark; methodology note still to obtain from the BVMAC
metadata:
  type: project
---

The bulletin parser has always captured the index (market_bulletins.index_value / index_variation_pct) and the capitalisation page (on each equity quote: market_cap_total/float, shares_*, last_dividend, liquidity_3m_pct). Since 2026-09-22 it is shown: `IndexPulse` (Titres + Actualités), `IndexVsShare` (company page, base 100), Comparer uses the 12-month index as reference for two shares, health check `index` (`indexCheck`), lesson `indice-bvmac` (widget "indice"), desk doc `/desk/docs/indice`, glossary term `indice`. Helpers in `src/lib/market/index.ts` (indexSeries, indexStats, indexWeights, indexCheck, base100). Real figures used in docs: bulletin 2565 of 2026-08-04, level 1 132,95, global cap 1 799,6 bn, BGFI Holding 73,7 % global / 42,3 % float.

**Why:** the user wanted the index leveraged; decisions posed and accepted: show both weightings marked "à confirmer" until the BVMAC methodology note arrives; pulse on both Titres and Actualités; weights from the parser (already there); a letter to the BVMAC (docs/courrier-bvmac-indice.md).

**How to apply:** never build an own index or a "vs index" client metric (regulatory + misleading on 7 illiquid shares). When the methodology arrives: file it at Dépôt › Références, update the doc + lesson wording, and make the Santé check recompute the index from prices. Mockup/doc artifact: https://claude.ai/artifact/U6sCpBZswzAtYDwiCcH8i8. Related: [[guichet-docs-and-guides]].
- 2026-09-22: public page `/indice` (src/app/indice, chart `src/components/IndexChart.tsx`: periods, crosshair, tap pins + date pickers, base 100, one share overlay, movers markers, gaps > 7 days not joined); moved-sessions table needs the seven equity histories (`listQuotes` per ISIN). Lesson widget: before → after, reacting bars, gauge, weighting hints.
- 2026-09-22 evening: seven views in IndexChart (niveau, volumes, contributions, calendrier, societes, capitalisation, flottant), data panel, CSV export, full sessions table; per-session caps = last share count × close; float reading is chained float-weighted returns, labelled non-published; src/lib/market/index-data.ts assembles everything.

**indexCheck reconstitutes on float weights** (2026-09-23): the Santé check only compared directions (index moved / a price moved) and weighed nothing, so it could not see a published variation six times too large. It now keeps both direction checks, then rebuilds the published variation from the session own float weights and reports « X publié, Y reconstitué au flottant »; outside the 0.8–1.25 band the point turns orange with the gap factor, and an opposite sign is named. Evidence for float weighting: 50 of 57 moving sessions reconstitute on float, 18 on global capitalisation. It stays an inference until the BVMAC confirms, so a gap reads as a session to clear, never as their error. Tests: src/lib/market/index-check.test.ts.
