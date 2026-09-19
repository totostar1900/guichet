---
name: guichet-bond-terms
description: Where the exact repayment terms of BVMAC-listed bonds come from and which issuers are still missing
metadata: 
  node_type: memory
  type: project
  originSessionId: 8ecfdc15-a97a-41f6-a140-c3c9f48a4903
  modified: 2026-09-15T19:21:47.236Z
---

BVMAC publishes issuer "fiches signalétiques" as JPG images at https://www.bvm-ac.org/espace-emetteurs/emetteurs-obligations/ (Gabon has 2 pages). They carry, per bond, the exact maturity date and a full échéancier (capital in equal instalments per payment date after a grace period, interest on the outstanding). Encoded in C:\dev\guichet\src\data\bond-terms.ts (28 ISINs as of Sept 2026: Gabon, Cameroun, Tchad, ACEP, Alios, SNPC).

**Why:** the BOC prints only the maturity year; without the fiche the yield is approximate (shown with ≈).

**How to apply:** when a new fiche appears (only État du Congo, EOCG 2021-2026, is still missing; BDEAC came from its IFRS 2025 statements, note 19), download the JPG, read it with the image reader, add the ISIN rows to bond-terms.ts and run a one-off update of `offers.maturity_on`. See [[guichet-project]].
