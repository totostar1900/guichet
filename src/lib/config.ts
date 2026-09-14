/** Product and company identity — the one place to change names. */
export const PRODUCT = {
  name: "Guichet",
  tagline: "Opportunités & instruments",
};

export const COMPANY = {
  name: "Purpose Capital",
  legalName: "Purpose Capital S.A.",
  tagline: "Guider le capital avec sens.",
  licence: "Société de bourse agréée COSUMAF · n° COSUMAF-SDB-01/2026",
  address: "Rue Joseph Essono Balla, Elig-Essono, Yaoundé, Cameroun",
  phone: "+237 6 87 67 67 67",
  email: "info@purposecapital.africa",
  site: "purposecapital.africa",
};

export const DISCLAIMER =
  "Communication à caractère promotionnel. Rendements actuariels bruts, convention Exact/Exact, hors commission et hors fiscalité, sous réserve du prix effectivement servi à l'adjudication. Une intention d'investissement n'est ni un ordre ni une garantie d'allocation. Risque de perte en capital.";

/** Settlement instructions printed on appels de fonds — fill from env in production. */
export const SETTLEMENT = {
  beneficiary: "Purpose Capital S.A. — compte de règlement clients (ségrégué)",
  bank: process.env.SETTLEMENT_BANK ?? "…………… (banque de règlement)",
  iban: process.env.SETTLEMENT_IBAN ?? "…………… (RIB à renseigner)",
};

/** Specialist in Treasury Securities used per issuer country (bordereau addressee). */
export const SVT_BY_COUNTRY: Record<string, { name: string; address: string }> = {
  RCA: { name: "Ecobank Centrafrique — Direction Trésorerie & Marchés", address: "Place de la République, B.P. 910 Bangui" },
  Congo: { name: "Ecobank Congo — Direction Trésorerie & Marchés", address: "B.P. 2485 Brazzaville" },
  Cameroun: { name: "Afriland First Bank — Salle des marchés", address: "B.P. 11834 Yaoundé" },
  Gabon: { name: "BGFI Bank Gabon — Salle des marchés", address: "B.P. 2253 Libreville" },
  Tchad: { name: "Orabank Tchad", address: "N'Djamena" },
  "Guinée éq.": { name: "BGFI Bank Guinée équatoriale", address: "B.P. 749 Malabo" },
};
