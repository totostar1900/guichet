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

/**
 * Human units for FCFA amounts: 1 234 567 890 → "1,23 Md", 45 600 000 → "45,6 M",
 * 812 000 → "812 k", 4 500 → "4 500". `unit` appends " FCFA".
 */
export const fmtUnits = (n: number, unit = false): string => {
  const a = Math.abs(n);
  const s =
    a >= 1e9
      ? `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md`
      : a >= 1e6
        ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`
        : a >= 1e4
          ? `${(n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`
          : nf.format(Math.round(n));
  return unit ? `${s} FCFA` : s;
};

/** The scale that fits a whole series, so a table reads in one unit: "millions de FCFA". */
export const pickScale = (values: number[]): { div: number; label: string; short: string } => {
  const m = Math.max(0, ...values.map((v) => Math.abs(v)));
  if (m >= 1e10) return { div: 1e9, label: "milliards de FCFA", short: "Md FCFA" };
  if (m >= 1e7) return { div: 1e6, label: "millions de FCFA", short: "M FCFA" };
  if (m >= 1e4) return { div: 1e3, label: "milliers de FCFA", short: "k FCFA" };
  return { div: 1, label: "FCFA", short: "FCFA" };
};
export const fmtScaled = (n: number, div: number, decimals = 1): string => (n / div).toLocaleString("fr-FR", { minimumFractionDigits: div === 1 ? 0 : decimals, maximumFractionDigits: div === 1 ? 0 : decimals });

/** "6 87 67 67 67" → "+237687676767"; a number already in +E.164 is kept. */
export const normalizePhone = (s: string | undefined): string => {
  const d = String(s ?? "").replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.startsWith("+")) return d;
  if (d.startsWith("00")) return `+${d.slice(2)}`;
  return d.length === 9 ? `+237${d}` : `+${d}`;
};
