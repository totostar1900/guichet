import { parseDate } from "./finance";

const nf = new Intl.NumberFormat("fr-FR");
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

export const fmt = (n: number): string => nf.format(Math.round(n));

export const fmtPct = (v: number, decimals = 1): string =>
  `${v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %`;

/** Price in % of nominal — 3 decimals only when needed. */
export const fmtPrice = (v: number): string => fmtPct(v, Number.isInteger(v) ? 0 : 3);

export const fmtDate = (iso: string, withYear = true): string => {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
};

export const fmtDateTime = (iso: string): string => {
  const d = parseDate(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getHours()).padStart(2, "0")} h ${String(d.getMinutes()).padStart(2, "0")}`;
};

export const fmtTime = (iso: string): string => {
  const d = parseDate(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const fmtMillions = (n: number): string => `${nf.format(Math.round(n / 1e6))} M`;

/** "10 000 000" → 10000000 */
export const parseAmount = (s: string | null | undefined): number => Number(String(s ?? "").replace(/[^\d]/g, "")) || 0;
/** Fund units keep their decimals: "175,207" → 175.207 (thousands spaces removed, comma or dot accepted). */
export const parseUnits = (s: string | null | undefined): number => {
  const t = String(s ?? "").replace(/[\s  ]/g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 0;
};

/** YYYY-MM-DD in local time (toISOString would shift the day in UTC+1). */
export const localIso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
