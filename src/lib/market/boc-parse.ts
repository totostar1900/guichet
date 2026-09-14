/**
 * Parser for the BVMAC « Bulletin Officiel de la Cote » (BOC), from the text
 * produced by pdf-parse. Pure, deterministic, tested against a real bulletin.
 *
 * Text shape (pdf-parse):
 *  - equities: one cell per line after the ISIN line;
 *  - bonds: a header line "ISSUER TITLE ISIN MNEMO" then one dense line of cells;
 *  - OPCVM: one line per fund (sometimes wrapped over 2–4 lines).
 */

export interface BocEquity {
  isin: string;
  mnemo: string;
  issuer: string;
  previousClose: number;
  previousDate: string; // YYYY-MM-DD
  volumeBid: number;
  volumeAsk: number;
  volumeTraded: number;
  valueTraded: number;
  trades: number;
  status: string;
  open: number;
  close: number;
  thresholdHigh: number;
  thresholdLow: number;
  variationPct: number;
  referenceNext: number;
  ytdHigh: number;
  ytdLow: number;
  ytdVariationPct: number | null;
}

export interface BocBond {
  isin: string;
  mnemo: string;
  issuer: string;
  designation: string; // title as printed, e.g. "ECMR 6.25% NET 2022-2029"
  segment: "etats" | "regionales" | "privees";
  previousDate: string;
  previousPct: number;
  previousFcfa: number;
  nominalRemaining: number; // J+3
  accruedCoupon: number; // J+3, FCFA per bond
  status: string;
  open: number;
  close: number;
  thresholdHigh: number;
  thresholdLow: number;
  variationPct: number;
  referenceNextFcfa: number;
}

export interface BocFund {
  manager: string;
  depositary: string;
  name: string;
  category: "M" | "O" | "D" | "A" | "?";
  frequency: "quotidienne" | "hebdomadaire" | "mensuelle" | "trimestrielle" | "?"; // section of the table the fund first appears in = valuation frequency
  variationMonthlyPct?: number; // from the « Mensuelles » section when the fund is repeated there
  variationQuarterlyPct?: number; // from « Trimestrielles »
  navOrigin: number;
  previousNav: number;
  previousDate: string;
  nav: number;
  navDate: string;
  inceptionDate: string;
  perfSinceInceptionPct: number;
  variationPct: number;
}

export interface BocParsed {
  bulletinNo: number;
  sessionDate: string; // YYYY-MM-DD
  index?: { value: number; variationPct: number };
  equities: BocEquity[];
  bonds: BocBond[];
  funds: BocFund[];
  notices: string[]; // titles of the avis (amortissements, paiements d'intérêts…)
  warnings: string[];
}

const ISIN_RE = /^([A-Z]{2})\s?(\d{10})$/;
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

export const num = (s: string): number => {
  const t = s.replace(/\s/g, "").replace(/ /g, "").replace("%", "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};
export const isoDate = (d: string): string => {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
};

export function parseBoc(text: string): BocParsed {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/ /g, " ").trim());
  const warnings: string[] = [];

  const head = text.match(/BULLETIN OFFICIEL DE LA COTE N°\s*(\d+)\s+DU\s+(\d{2}\/\d{2}\/\d{4})/);
  const bulletinNo = head ? Number(head[1]) : 0;
  const sessionDate = head ? isoDate(head[2]) : "";
  if (!head) warnings.push("En-tête du bulletin non reconnu (numéro / date).");

  // Index
  let index: BocParsed["index"];
  // "BVMAC ALL SHARE INDEX" is followed by the level and the day variation, each on its own line.
  const iIdx = lines.findIndex((l) => /^BVMAC ALL SHARE INDEX/.test(l));
  if (iIdx >= 0) {
    const nums = lines.slice(iIdx + 1, iIdx + 6).filter((l) => /^-?[\d ]+,\d{2}%?$/.test(l));
    const v = nums[0] ? num(nums[0]) : NaN;
    const vv = nums[1] ? num(nums[1]) : NaN;
    if (Number.isFinite(v)) index = { value: v, variationPct: Number.isFinite(vv) ? vv : 0 };
    else warnings.push("Indice BVMAC ALL SHARE non lu.");
  } else warnings.push("Indice BVMAC ALL SHARE introuvable.");

  const equities = parseEquities(lines, warnings);
  const bonds = parseBonds(lines, warnings);
  const funds = parseFunds(lines, warnings);
  const notices = lines.filter((l) => /^«.*»\s*$/.test(l)).map((l) => l.replace(/[«»]/g, "").trim());

  return { bulletinNo, sessionDate, index, equities, bonds, funds, notices, warnings };
}

/* ---------------- Actions ---------------- */
function parseEquities(lines: string[], warnings: string[]): BocEquity[] {
  const out: BocEquity[] = [];
  const start = lines.findIndex((l) => /^MARCHE DES ACTIONS/.test(l));
  const end = lines.findIndex((l, i) => i > start && /^MARCHE DES OBLIGATIONS/.test(l));
  if (start < 0) {
    warnings.push("Section « Marché des actions » introuvable.");
    return out;
  }
  const section = lines.slice(start, end > start ? end : undefined);
  for (let i = 0; i < section.length; i++) {
    const m = section[i].match(ISIN_RE);
    if (!m) continue;
    const isin = `${m[1]}${m[2]}`;
    // issuer = the non-empty lines just above, until a previous row's trailing number
    const issuerLines: string[] = [];
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      const l = section[j];
      if (!l || /^[\d\s,.%-]+$/.test(l) || ISIN_RE.test(l) || /^(Haut|Bas|Variation)\b/.test(l)) break;
      issuerLines.unshift(l);
    }
    const cells = section.slice(i + 1, i + 24);
    // mnemo (1–2 lines) until the previous close (a number)
    let k = 0;
    const mnemoParts: string[] = [];
    while (k < cells.length && Number.isNaN(num(cells[k])) && !DATE_RE.test(cells[k]) && k < 3) mnemoParts.push(cells[k++]);
    const dateAt = cells.findIndex((c, idx) => idx >= k && DATE_RE.test(c));
    if (dateAt < 0) {
      warnings.push(`Action ${isin} : ligne incomplète.`);
      continue;
    }
    const previousClose = num(cells[dateAt - 1]);
    const previousDate = isoDate(cells[dateAt]);
    const rest = cells.slice(dateAt + 1);
    const statusAt = rest.findIndex((c) => /^[A-Z]{1,3}[a-z]?$/.test(c));
    if (statusAt < 0) {
      warnings.push(`Action ${isin} : statut introuvable.`);
      continue;
    }
    const vols = rest.slice(0, statusAt).map(num);
    const after = rest.slice(statusAt + 1);
    const n = (idx: number) => num(after[idx] ?? "");
    const ytdVar = after[8] === "-" || after[8] === undefined || Number.isNaN(n(8)) ? null : n(8);
    out.push({
      isin,
      mnemo: (mnemoParts[0] ?? "").replace(/\s/g, ""),
      issuer: issuerLines.join(" ").replace(/\s+/g, " ").trim(),
      previousClose,
      previousDate,
      volumeBid: vols[0] ?? 0,
      volumeAsk: vols[1] ?? 0,
      volumeTraded: vols[2] ?? 0,
      valueTraded: vols[3] ?? 0,
      trades: vols[4] ?? 0,
      status: rest[statusAt],
      open: n(0),
      close: n(1),
      thresholdHigh: n(2),
      thresholdLow: n(3),
      variationPct: n(4),
      referenceNext: n(5),
      ytdHigh: n(6),
      ytdLow: n(7),
      ytdVariationPct: ytdVar,
    });
  }
  return out;
}

/* ---------------- Obligations ---------------- */
const BOND_HEAD = /^(.*?)([A-Z]{2}\d{10})([A-Z][A-Z0-9]{3,5}?)(\d{2}\/\d{2}\/\d{4}.*)?$/;

/** Splits "<prix FCFA><nominal,ddd>" where the price may lack decimals: keeps the split consistent with price ≈ pct × nominal / 100. */
function splitPriceNominal(mid: string, pct: number): { price: number; nominal: number } | undefined {
  const clean = mid.replace(/ /g, "");
  const m = clean.match(/^(.*?),(\d{3})$/);
  if (!m) return undefined;
  const body = m[1]; // "<price><nominal-int>" with optional ",dd" in price
  for (let cut = 1; cut < body.length; cut++) {
    const price = num(body.slice(0, cut));
    const nominal = num(`${body.slice(cut)},${m[2]}`);
    if (!Number.isFinite(price) || !Number.isFinite(nominal) || nominal <= 0) continue;
    if (Math.abs(price - (pct * nominal) / 100) < 1.5) return { price, nominal };
  }
  return undefined;
}

/** Issuers whose name is glued to the title in the dense layout ("ETAT DU CAMEROUNECMR 6.25% …"). */
const ISSUERS = ["ETAT DU CAMEROUN", "ETAT DU GABON", "ETAT DU TCHAD", "ETAT DU CONGO", "ETAT DE CENTRAFRIQUE", "ETAT DE GUINEE EQUATORIALE", "BDEAC", "BEAC", "ALIOS FINANCE", "ACEP CAMEROUN", "SNPC"];
function splitIssuer(raw: string): { issuer: string; designation: string } {
  const t = raw.replace(/\s+/g, " ").trim();
  for (const iss of ISSUERS) {
    if (t.toUpperCase().startsWith(iss)) return { issuer: iss, designation: t.slice(iss.length).trim() || t };
  }
  // generic: "<ISSUER> <CODE> <rate>% …" — the title starts at the token preceding the rate
  const m = t.match(/^(.*?)\s+([A-Z0-9-]+(?: MT)? \d+[.,]?\d*\s?%.*)$/);
  if (m) return { issuer: m[1].trim(), designation: m[2].trim() };
  return { issuer: t, designation: t };
}

function segmentOf(designation: string): BocBond["segment"] {
  if (/^ETAT|^REPUBLIQUE/i.test(designation)) return "etats";
  if (/BDEAC|BEAC|CEMAC/i.test(designation)) return "regionales";
  return "privees";
}

// date · prev % · price+nominal · accrued · volumes (may hold spaces when the line traded) · status · open · close · high · low · var · ref
const DENSE = /^(\d{2}\/\d{2}\/\d{4})(\d{1,3},\d{2})(.+?,\d{3})(\d{1,4},\d{2})([\d ]*?)([A-Z]{1,3}[a-z]?)(\d{1,3},\d{2})(\d{1,3},\d{2})(\d{1,3},\d{2})(\d{1,3},\d{2})(-?\d+,\d{2}%)([\d ]+,\d{2})$/;

function parseBonds(lines: string[], warnings: string[]): BocBond[] {
  const out: BocBond[] = [];
  const start = lines.findIndex((l) => /^MARCHE DES OBLIGATIONS/.test(l));
  const end = lines.findIndex((l, i) => i > start && /^CAPITALISATION BOURSIERE/.test(l));
  if (start < 0) {
    warnings.push("Section « Marché des obligations » introuvable.");
    return out;
  }
  const seen = new Set<string>();
  // When a line traded, pdf-parse may glue the next bond's head to the end of the data row
  // ("…0,00%9 700,00ETAT DU GABON…"): split after a ",dd" amount that is followed by capitals.
  const section = lines.slice(start, end > start ? end : undefined).flatMap((l) => l.split(/(?<=,\d{2})(?=[A-Z]{2,})/));
  for (let i = 0; i < section.length; i++) {
    const l = section[i].replace(/\s+/g, " ");
    // Layout A: dense head "ISSUER TITLE ISIN MNEMO" + dense data line(s)
    const h = l.match(BOND_HEAD);
    if (h && !ISIN_RE.test(l)) {
      const isin = h[2];
      if (seen.has(isin)) continue;
      // The data row may start on the head line itself and wrap over up to three lines.
      let r: RegExpMatchArray | null = null;
      let cand = (h[4] ?? "").trim();
      for (let k = 0; k <= 3 && !r; k++) {
        if (k > 0) cand += (section[i + k] ?? "").replace(/\s{2,}/g, " ");
        r = cand.match(DENSE);
      }
      if (!r) {
        warnings.push(`Obligation ${isin} : ligne de cours non reconnue.`);
        continue;
      }
      const pct = num(r[2]);
      const pn = splitPriceNominal(r[3], pct);
      if (!pn) {
        warnings.push(`Obligation ${isin} : prix / nominal ambigus (« ${r[3]} »).`);
        continue;
      }
      seen.add(isin);
      const { issuer, designation } = splitIssuer(h[1]);
      out.push({ isin, mnemo: h[3], issuer, designation, segment: segmentOf(issuer), previousDate: isoDate(r[1]), previousPct: pct, previousFcfa: pn.price, nominalRemaining: pn.nominal, accruedCoupon: num(r[4]), status: r[6], open: num(r[7]), close: num(r[8]), thresholdHigh: num(r[9]), thresholdLow: num(r[10]), variationPct: num(r[11]), referenceNextFcfa: num(r[12]) });
      continue;
    }
    // Layout B: one cell per line — "ISSUER", "TITLE", "ISIN", "MNEMO", date, pct, fcfa, nominal, accrued, vol×5, status, open, close, high, low, variation, ref
    const m = section[i].match(ISIN_RE);
    if (!m) continue;
    const isin = `${m[1]}${m[2]}`;
    if (seen.has(isin)) continue;
    const cells = section.slice(i + 1, i + 22);
    const dateAt = cells.findIndex((c) => DATE_RE.test(c));
    if (dateAt < 0 || dateAt > 2) continue;
    const mnemo = cells[0];
    const after = cells.slice(dateAt + 1);
    const statusAt = after.findIndex((c) => /^[A-Z]{1,3}[a-z]?$/.test(c));
    if (statusAt < 4) {
      warnings.push(`Obligation ${isin} : cellules incomplètes.`);
      continue;
    }
    seen.add(isin);
    const { issuer, designation } = splitIssuer([section[i - 2], section[i - 1]].filter((x) => x && !/^[\d\s,.%-]+$/.test(x)).join(" "));
    const tail = after.slice(statusAt + 1).map(num);
    out.push({ isin, mnemo, issuer, designation, segment: segmentOf(issuer), previousDate: isoDate(cells[dateAt]), previousPct: num(after[0]), previousFcfa: num(after[1]), nominalRemaining: num(after[2]), accruedCoupon: num(after[3]), status: after[statusAt], open: tail[0], close: tail[1], thresholdHigh: tail[2], thresholdLow: tail[3], variationPct: tail[4], referenceNextFcfa: tail[5] });
  }
  return out;
}

/* ---------------- OPCVM ---------------- */
const FUND_TAIL = /\b([MODA0])\s+([\d ]+?)\s+(-|\d{1,3}(?: \d{3})*,\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{1,3}(?: \d{3})*,\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(-?[\d ]+(?:,\d{1,2})?%)\s+(-|-?[\d ]+(?:,\d{1,2})?%)\s*$/;
const MANAGER_RE = /^(.*?(ASSET MANAGEMENT(?: S\.A\.?| CEMAC| CENTRAL AFRICA)?|CAPITAL CENTRAL AFRICA))\s+(.*)$/;
const FUND_SKIP = /^(BULLETIN OFFICIEL|Société de gestion|Valeur liquidative|Origine|Précédente|Variation|Valeur Date|CAPITAL VARIABLE|\d{1,2}$)/;
const SECTION: Record<string, BocFund["frequency"]> = { quotidiennes: "quotidienne", hebdomadaires: "hebdomadaire", mensuelles: "mensuelle", trimestrielles: "trimestrielle" };

function parseFunds(lines: string[], warnings: string[]): BocFund[] {
  const out: BocFund[] = [];
  const start = lines.findIndex((l) => /^OPCVM\s*:/.test(l));
  if (start < 0) {
    warnings.push("Section OPCVM introuvable.");
    return out;
  }
  // The table is split in four sections by the period of the variation shown
  // (daily, weekly, monthly, quarterly). A fund appears first in the section of
  // its valuation frequency and may be repeated in the longer periods.
  let frequency: BocFund["frequency"] = "?";
  let buffer = "";
  const byName = new Map<string, BocFund>();
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    if (/^OPCVM\s*:\s*Organisme/i.test(l)) break; // footnote closes the table
    const sec = SECTION[l.trim().toLowerCase()];
    if (sec) {
      frequency = sec;
      buffer = "";
      continue;
    }
    if (FUND_SKIP.test(l) || /^OPCVM\s*:/.test(l)) continue;
    buffer = buffer ? `${buffer} ${l}` : l;
    const m = buffer.match(FUND_TAIL);
    if (!m) {
      if (buffer.length > 260) buffer = "";
      continue;
    }
    const prefix = buffer.slice(0, m.index).trim();
    buffer = "";
    const nameAt = prefix.search(/\b(FCPE|FCP|SICAV)/);
    const name = nameAt >= 0 ? prefix.slice(nameAt).replace(/^FCP(?=[A-DF-Z]|E[A-Z])/, "FCP ").replace(/\s+/g, " ").trim() : prefix;
    const prior = byName.get(name);
    if (prior) {
      const v = m[9] === "-" ? undefined : num(m[9]);
      if (frequency === "mensuelle") prior.variationMonthlyPct = v;
      if (frequency === "trimestrielle") prior.variationQuarterlyPct = v;
      continue;
    }
    const before = nameAt >= 0 ? prefix.slice(0, nameAt).trim() : "";
    const mm = before.match(MANAGER_RE);
    const manager = mm ? mm[1].trim() : before;
    const depositary = mm ? mm[3].trim() : "";
    const cat = m[1] === "0" ? "O" : (m[1] as BocFund["category"]);
    const fund: BocFund = {
      manager,
      depositary,
      name,
      category: (["M", "O", "D", "A"] as const).includes(cat as "M") ? (cat as BocFund["category"]) : "?",
      frequency,
      navOrigin: num(m[2]),
      previousNav: m[3] === "-" ? NaN : num(m[3]),
      previousDate: isoDate(m[4]),
      nav: num(m[5]),
      navDate: isoDate(m[6]),
      inceptionDate: isoDate(m[7]),
      perfSinceInceptionPct: num(m[8]),
      variationPct: m[9] === "-" ? NaN : num(m[9]),
    };
    byName.set(name, fund);
    out.push(fund);
  }
  if (out.length === 0) warnings.push("Aucun OPCVM lu.");
  return out;
}
