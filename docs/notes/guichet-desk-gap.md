---
name: guichet-desk-gap
description: Desk pages share one 42px gap under the desk bar (DeskNav margin-bottom); no page adds its own top margin; sanctions pre-check without provider shows manual lists
metadata:
  type: feedback
---

On 2026-09-22 the user asked to harmonise the space between the « Pilotage » desk bar and every page's content, left and right panes level.

**Why:** the docs reader had grown its own 42px offsets (outline, then article) while every other desk page sat 14px under the bar; the user wants one line for all content.
**How to apply:** the gap lives once in `src/components/DeskNav.module.css` (`.nav { margin-bottom: 42px }`); never add a top margin/padding to a desk page's first block or a pane. Panels keep their own inner padding. Also: without OPENSANCTIONS_API_KEY the review form shows the public lists (MANUAL_LISTS in `src/lib/kyc/screening.ts`) instead of the pre-check button; never show env-var names to the desk. See [[guichet-docs-and-guides]].
