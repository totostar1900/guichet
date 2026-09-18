---
name: guichet-companies-data
description: How the listed-company data (7 BVMAC issuers) is sourced and refreshed in Guichet; where scanned PDFs need rendering
metadata: 
  node_type: memory
  type: project
  originSessionId: 8ecfdc15-a97a-41f6-a140-c3c9f48a4903
  modified: 2026-09-14T20:13:33.537Z
---

The 7 BVMAC equities (SEMC, SAF, SOCAP, REG, BANGE, SCGRE, BHC) live in `src/data/companies.ts` with certified figures per year taken from the issuers' fiches signalétiques on bvm-ac.org (4 years each) plus the SEMC 2025 OHADA statements read visually. Most older BVMAC statement PDFs are scanned images (no text layer); `scripts/pdf-pages.mjs` (pdfjs-dist + node-canvas, dev deps) renders pages to PNG so they can be read with the Read tool. Raw PDF copies are in `C:\dev\guichet\.uploads\issuers\` (git-ignored) and, after the weekly `/api/cron/emetteurs`, in the Supabase `sources/issuers/` bucket.

**Why:** the user wants the platform to compile issuer information like a large fintech; figures must stay traceable to certified documents.
**How to apply:** when a new annual report appears (desk alert from the collector), read its balance sheet / P&L pages and add a `YearFigures` entry with its `source`; never invent figures. Related: [[guichet-project]].
