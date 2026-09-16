/**
 * Repayment terms of the bonds listed at the BVMAC, read from the issuers'
 * fiches signalétiques published by the exchange (August 2026 editions). The
 * BOC prints only the year of maturity; these give the exact date, how often
 * the line pays, and from when the capital is repaid. Capital is repaid in
 * equal instalments on every payment date after the grace period — the
 * pattern of every schedule on those fiches — on the nominal remaining per
 * title that the BOC already carries.
 */
export interface BondTerms {
  isin: string;
  maturityOn: string; // YYYY-MM-DD
  periodsPerYear: 1 | 2 | 4;
  /** Payment dates up to this one carry interest only. */
  graceUntil?: string;
  source: string;
}

const GABON = "Fiche signalétique État du Gabon, 25/08/2026";
const CAMEROUN = "Fiche signalétique État du Cameroun, 25/08/2026";
const TCHAD = "Fiche signalétique État du Tchad, 25/08/2026";
const ALIOS = "Fiche signalétique Alios Finance Cameroun, 17/08/2026";
const ACEP = "Fiche signalétique ACEP Cameroun, 25/08/2026";
const SNPC = "Fiche signalétique SNPC, 31/12/2025";
const BDEAC = "États financiers IFRS 2025 de la BDEAC, note 19 (emprunts), mai 2026";

export const BOND_TERMS: BondTerms[] = [
  // État du Gabon
  { isin: "GA0000020248", maturityOn: "2026-06-04", periodsPerYear: 1, source: GABON }, // EOG 6,00 % NET 2021-2026 (échue)
  { isin: "GA0000020313", maturityOn: "2028-11-01", periodsPerYear: 1, source: GABON }, // EOG 6,25 % NET 2022-2028
  { isin: "GA0000020396", maturityOn: "2028-07-15", periodsPerYear: 1, source: GABON }, // EOG 6,25 % NET 2023-2028
  { isin: "GA0000020487", maturityOn: "2027-03-29", periodsPerYear: 1, source: GABON }, // EOG 6 % NET 2024-2027
  { isin: "GA0000020495", maturityOn: "2029-03-29", periodsPerYear: 1, source: GABON }, // EOG 6,5 % NET 2024-2029
  { isin: "GA0000020503", maturityOn: "2031-03-29", periodsPerYear: 1, source: GABON }, // EOG 7,5 % NET 2024-2031
  { isin: "GA0000020511", maturityOn: "2027-07-01", periodsPerYear: 1, source: GABON }, // EOG MT 6,60 % NET 2024-2027
  { isin: "GA0000020529", maturityOn: "2028-07-01", periodsPerYear: 1, source: GABON }, // EOG MT 6,75 % NET 2024-2028
  { isin: "GA0000020537", maturityOn: "2030-07-01", periodsPerYear: 1, source: GABON }, // EOG MT 7 % NET 2024-2030
  { isin: "GA0000020552", maturityOn: "2027-12-30", periodsPerYear: 1, source: GABON }, // EOG MT 6,6 % NET 2024-2027-II
  { isin: "GA0000020560", maturityOn: "2028-12-30", periodsPerYear: 1, graceUntil: "2026-12-30", source: GABON }, // EOG MT 6,75 % NET 2024-2028-II
  { isin: "GA0000020578", maturityOn: "2030-12-30", periodsPerYear: 1, graceUntil: "2026-12-30", source: GABON }, // EOG MT 7,00 % NET 2024-2030-II
  { isin: "GA0000020594", maturityOn: "2027-04-05", periodsPerYear: 1, source: GABON }, // EOG 5,6 % NET 2025-2027
  { isin: "GA0000020602", maturityOn: "2028-04-05", periodsPerYear: 1, graceUntil: "2027-04-05", source: GABON }, // EOG 6 % NET 2025-2028
  { isin: "GA0000020636", maturityOn: "2027-10-01", periodsPerYear: 1, source: GABON }, // EOG 5,6 % NET 2025-2027 II
  { isin: "GA0000020644", maturityOn: "2028-10-01", periodsPerYear: 1, graceUntil: "2027-10-01", source: GABON }, // EOG 6 % NET 2025-2028 II
  // État du Cameroun
  { isin: "CM0000020354", maturityOn: "2026-06-23", periodsPerYear: 1, source: CAMEROUN }, // ECMR 5,80 % NET 2023-2026 (échue)
  { isin: "CM0000020305", maturityOn: "2029-05-27", periodsPerYear: 1, source: CAMEROUN }, // ECMR 6,25 % NET 2022-2029
  { isin: "CM0000020362", maturityOn: "2027-06-23", periodsPerYear: 1, source: CAMEROUN }, // ECMR 6,00 % NET 2023-2027
  { isin: "CM0000020370", maturityOn: "2029-06-23", periodsPerYear: 1, source: CAMEROUN }, // ECMR 6,75 % NET 2023-2029
  { isin: "CM0000020388", maturityOn: "2031-06-23", periodsPerYear: 1, source: CAMEROUN }, // ECMR 7,25 % NET 2023-2031
  // État du Tchad
  { isin: "TD0000020331", maturityOn: "2027-12-30", periodsPerYear: 1, source: TCHAD }, // EOTD 6,5 % NET 2022-2027
  // ACEP Cameroun — semi-annual
  { isin: "CM0000020545", maturityOn: "2027-12-30", periodsPerYear: 2, source: ACEP }, // ACEP 7 % BRUT 2024-2027
  // Alios Finance Cameroun
  { isin: "CM0000020404", maturityOn: "2026-08-16", periodsPerYear: 2, source: ALIOS }, // ALIOS 04 6,00 % BRUT 2023-2026 (échue)
  { isin: "CM0000020412", maturityOn: "2028-08-16", periodsPerYear: 2, source: ALIOS }, // ALIOS 03 6,50 % BRUT 2023-2028
  { isin: "CM0000020610", maturityOn: "2028-08-07", periodsPerYear: 4, source: ALIOS }, // ALIOS-05 6 % BRUT 2025-2028
  { isin: "CM0000020628", maturityOn: "2030-08-07", periodsPerYear: 4, source: ALIOS }, // ALIOS-06 7 % BRUT 2025-2030
  // SNPC
  { isin: "CG0000020584", maturityOn: "2029-12-31", periodsPerYear: 1, source: SNPC }, // SNPC 6,5 % NET 2024-2029
  // BDEAC — two-year grace then equal annual instalments; the nominal restant printed in the BOC confirms it
  { isin: "CG0000020220", maturityOn: "2027-12-31", periodsPerYear: 1, source: BDEAC }, // BDEAC 5,45 % NET 2020-2027
  { isin: "CG0000020261", maturityOn: "2028-12-08", periodsPerYear: 1, source: BDEAC }, // BDEAC 5,6 % NET 2021-2028
  { isin: "CG0000020329", maturityOn: "2029-12-30", periodsPerYear: 1, source: BDEAC }, // BDEAC 6 % NET 2022-2029
  { isin: "CG0000020444", maturityOn: "2027-03-24", periodsPerYear: 1, source: BDEAC }, // BDEAC 4,70 % NET 2024-2027
  { isin: "CG0000020436", maturityOn: "2029-03-24", periodsPerYear: 1, graceUntil: "2026-03-24", source: BDEAC }, // BDEAC 5,95 % NET 2024-2029
  { isin: "CG0000020469", maturityOn: "2031-03-24", periodsPerYear: 1, graceUntil: "2026-03-24", source: BDEAC }, // BDEAC 6,20 % NET 2024-2031
];

const BY_ISIN = new Map(BOND_TERMS.map((t) => [t.isin, t]));
export const bondTerms = (isin: string): BondTerms | undefined => BY_ISIN.get(isin);
