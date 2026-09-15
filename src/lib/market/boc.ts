import "server-only";
import type { Country, Offer } from "@/lib/domain/types";
import { fundKey, type FundNav, type MarketBulletin, type Quote } from "@/lib/domain/market";
import { repo } from "@/lib/data";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { saveSource } from "@/lib/intake/storage";
import { parseBoc, type BocBond, type BocEquity, type BocFund, type BocParsed } from "./boc-parse";
import { prettyName } from "./names";
import { companyByIsin } from "@/data/companies";

const COMPANY_DOC_LABEL: Record<string, string> = { fiche: "Fiche signalétique", etats_ohada: "États financiers OHADA", etats_ifrs: "États financiers IFRS", rapport_gestion: "Rapport de gestion", rapport_semestriel: "Rapport semestriel", note_information: "Note d'information", autre: "Document" };
/** The issuer's own filings at the BVMAC, newest first, for the fiche of a listed share. */
function companyDocuments(isin: string): Offer["documents"] {
  const c = companyByIsin(isin);
  if (!c) return [];
  return [...c.documents]
    .sort((a, b) => b.year - a.year)
    .slice(0, 4)
    .map((d) => ({ name: `${COMPANY_DOC_LABEL[d.kind] ?? "Document"} ${d.year}`, meta: `bvm-ac.org · ${d.url.endsWith(".pdf") ? "PDF" : "image"}`, url: d.url }));
}

export { prettyName };

/**
 * Daily ingestion of the BVMAC « Bulletin Officiel de la Cote ».
 *
 *  fetch (deterministic URL) → text (pdf-parse, pure Node) → parseBoc (deterministic)
 *  → validate against the previous bulletin → quotes + NAVs history → listed lines
 *  of the Guichet refreshed or created → desk feed.
 *
 * Idempotent: re-ingesting the same session overwrites the same rows.
 * The PDF itself is kept (audit trail of every published price).
 */

export const BOC_BASE = "https://www.bvm-ac.org/wp-content/uploads";

/** BOC-YYYYMMDD.pdf lives under /YYYY/MM/ of the WordPress uploads. */
export function bocUrl(sessionDate: string): string {
  const [y, m, d] = sessionDate.split("-");
  return `${BOC_BASE}/${y}/${m}/BOC-${y}${m}${d}.pdf`;
}

/** Default commission applied to lines created from the bulletin; the desk can change it per line. */
export const MARKET_DEFAULT_COMMISSION: Record<Quote["instrument"], number> = { action: 1, obligation: 0.5 };

const COUNTRY_BY_ISIN: Record<string, { country: Country; name: string }> = {
  CM: { country: "Cameroun", name: "Cameroun · BVMAC" },
  GA: { country: "Gabon", name: "Gabon · BVMAC" },
  TD: { country: "Tchad", name: "Tchad · BVMAC" },
  CG: { country: "Congo", name: "Congo · BVMAC" },
  CF: { country: "RCA", name: "RCA · BVMAC" },
  GQ: { country: "Guinée éq.", name: "Guinée équatoriale · BVMAC" },
};

export interface IngestResult {
  found: boolean;
  bulletin?: MarketBulletin;
  created: string[]; // offer ids created
  refreshed: string[]; // offer ids refreshed
  sessionDate?: string;
  error?: string;
}

/* ---------------- fetch & text ---------------- */

export async function fetchBoc(sessionDate: string): Promise<{ bytes: Uint8Array; url: string } | undefined> {
  const url = bocUrl(sessionDate);
  const res = await fetch(url, { headers: { "user-agent": "Guichet/1.0 (Purpose Capital; market data ingestion)" }, cache: "no-store" });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`BVMAC a répondu ${res.status} pour ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length < 1000 || String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") throw new Error(`Le fichier ${url} n'est pas un PDF.`);
  return { bytes, url };
}

export async function pdfText(bytes: Uint8Array): Promise<string> {
  // The package entry point runs a self-test when `module.parent` is empty; the lib file does not.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const out = await pdfParse(Buffer.from(bytes));
  return out.text;
}

/* ---------------- mapping ---------------- */

const isinCountry = (isin: string) => COUNTRY_BY_ISIN[isin.slice(0, 2)] ?? { country: "Cameroun" as Country, name: "CEMAC · BVMAC" };

export function equityQuote(e: BocEquity, b: BocParsed): Quote {
  const c = b.capitalisation.find((x) => x.isin === e.isin);
  const cap = c ? { sharesFloat: c.sharesFloat, sharesTotal: c.sharesTotal, lastDividend: c.lastDividend, dividendYear: c.dividendYear, dividendDate: c.dividendDate, liquidity3mPct: c.liquidity3mPct, eps: c.eps, marketCapFloat: c.marketCapFloat, marketCapTotal: c.marketCapTotal } : {};
  return {
    ...cap,
    isin: e.isin, sessionDate: b.sessionDate, bulletinNo: b.bulletinNo, instrument: "action", mnemo: e.mnemo, issuer: e.issuer, designation: e.issuer,
    previousClose: e.previousClose, previousDate: e.previousDate, open: e.open, close: e.close, thresholdHigh: e.thresholdHigh, thresholdLow: e.thresholdLow,
    variationPct: e.variationPct, referenceNext: e.referenceNext, volumeTraded: e.volumeTraded, valueTraded: e.valueTraded, trades: e.trades, status: e.status, ytdVariationPct: e.ytdVariationPct,
  };
}

export function bondQuote(o: BocBond, b: BocParsed): Quote {
  return {
    isin: o.isin, sessionDate: b.sessionDate, bulletinNo: b.bulletinNo, instrument: "obligation", mnemo: o.mnemo, issuer: o.issuer, designation: o.designation, segment: o.segment,
    previousClose: o.previousPct, previousDate: o.previousDate, open: o.open, close: o.close, thresholdHigh: o.thresholdHigh, thresholdLow: o.thresholdLow,
    variationPct: o.variationPct, referenceNext: o.referenceNextFcfa, volumeTraded: 0, valueTraded: 0, trades: 0, status: o.status, nominalRemaining: o.nominalRemaining, accruedCoupon: o.accruedCoupon,
  };
}

export function fundNav(f: BocFund, b: BocParsed): FundNav {
  const fin = (v: number | undefined) => (v != null && Number.isFinite(v) ? v : undefined);
  return {
    fundKey: fundKey(f.name), name: f.name, manager: f.manager, depositary: f.depositary, category: f.category, frequency: f.frequency, navDate: f.navDate, nav: f.nav,
    previousNav: fin(f.previousNav), previousDate: f.previousDate, navOrigin: f.navOrigin, inceptionDate: f.inceptionDate, perfSinceInceptionPct: f.perfSinceInceptionPct,
    variationPct: fin(f.variationPct), variationMonthlyPct: fin(f.variationMonthlyPct), variationQuarterlyPct: fin(f.variationQuarterlyPct), bulletinNo: b.bulletinNo, sessionDate: b.sessionDate,
  };
}

/* ---------------- validation ---------------- */

/** What was read but looks wrong — the desk sees these before trusting the day's prices. */
export function validate(parsed: BocParsed, quotes: Quote[], navs: FundNav[], previous: Quote[]): string[] {
  const out: string[] = [];
  const prevBy = new Map(previous.map((q) => [q.isin, q]));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.sessionDate)) out.push("Date de séance illisible.");
  if (parsed.equities.length < 5) out.push(`Seulement ${parsed.equities.length} action(s) lue(s) — la section semble incomplète.`);
  if (parsed.bonds.length < 20) out.push(`Seulement ${parsed.bonds.length} obligation(s) lue(s) — la section semble incomplète.`);
  if (parsed.funds.length < 20) out.push(`Seulement ${parsed.funds.length} OPCVM lu(s) — la table semble incomplète.`);
  for (const q of quotes) {
    const label = `${q.mnemo} (${q.isin})`;
    if (!(q.close > 0)) out.push(`${label} : cours de clôture nul ou illisible.`);
    if (q.thresholdLow > 0 && q.thresholdHigh > 0 && (q.close < q.thresholdLow - 1e-6 || q.close > q.thresholdHigh + 1e-6)) out.push(`${label} : clôture ${q.close} hors des seuils ${q.thresholdLow} – ${q.thresholdHigh}.`);
    if (q.instrument === "obligation" && (q.close < 50 || q.close > 130)) out.push(`${label} : cours obligataire ${q.close} % improbable.`);
    if (q.instrument === "obligation" && q.accruedCoupon != null && q.nominalRemaining != null && q.accruedCoupon > q.nominalRemaining * 0.12) out.push(`${label} : coupon couru ${q.accruedCoupon} incohérent avec le nominal ${q.nominalRemaining}.`);
    if (q.previousDate > parsed.sessionDate) out.push(`${label} : date du cours précédent postérieure à la séance.`);
    const p = prevBy.get(q.isin);
    if (p && p.sessionDate < q.sessionDate && p.close > 0) {
      const move = Math.abs(q.close / p.close - 1) * 100;
      if (move > 15) out.push(`${label} : ${move.toFixed(1)} % d'écart avec le dernier cours ingéré (${p.close} le ${fmtDate(p.sessionDate)}).`);
    }
  }
  const known = new Set(previous.map((q) => q.isin));
  const missing = [...known].filter((isin) => !quotes.some((q) => q.isin === isin));
  if (known.size && missing.length) out.push(`Lignes présentes au bulletin précédent et absentes aujourd'hui : ${missing.join(", ")}.`);
  for (const n of navs) {
    if (!(n.nav > 0)) out.push(`${n.name} : VL nulle ou illisible.`);
    if (n.navDate > parsed.sessionDate) out.push(`${n.name} : date de VL postérieure à la séance.`);
    if (n.previousNav && Math.abs(n.nav / n.previousNav - 1) > 0.1) out.push(`${n.name} : VL ${fmt(n.nav)} vs ${fmt(n.previousNav)} précédente (> 10 %).`);
  }
  return out;
}

/* ---------------- listed lines of the Guichet ---------------- */

const couponFromDesignation = (d: string): number | undefined => {
  const m = d.match(/(\d+(?:[.,]\d+)?)\s?%/);
  return m ? Number(m[1].replace(",", ".")) : undefined;
};
const maturityYear = (d: string): string | undefined => d.match(/\b(\d{4})\s*-\s*(\d{4})\b/)?.[2];

export function offerFromQuote(q: Quote, bulletinNo: number, existing?: Offer): Offer {
  const geo = isinCountry(q.isin);
  const isBond = q.instrument === "obligation";
  const source = `Cours du Bulletin Officiel de la Cote n° ${bulletinNo} du ${fmtDate(q.sessionDate)} (BVMAC).`;
  const base: Offer = existing ?? {
    id: `boc-${q.isin.toLowerCase()}`,
    kind: "MARCHE",
    operation: "secondaire",
    country: geo.country,
    countryName: geo.name,
    issuer: prettyName(q.issuer),
    title: isBond ? `${prettyName(q.issuer)} · ${q.designation.replace(/(\d)\.(\d)/, "$1,$2").replace(/%/, " %")}` : `${q.mnemo} — ${prettyName(q.issuer)}`,
    isin: q.isin,
    status: "published",
    blurb: isBond
      ? `Obligation cotée à la BVMAC (${q.mnemo}). Ordres d'achat et de vente au cours du jour, coupon couru réglé au prorata, règlement T+3.`
      : `Action cotée à la BVMAC (${q.mnemo}). Ordres d'achat et de vente exécutés au marché ou à cours limité, règlement T+3.`,
    documents: [{ name: "Bulletin Officiel de la Cote", meta: `BOC n° ${bulletinNo}`, url: bocUrl(q.sessionDate) }],
    opensAt: `${q.sessionDate}T09:00:00`,
    deadlineAt: "2099-12-31T17:00:00",
    settleOn: q.sessionDate,
    maturityOn: isBond && maturityYear(q.designation) ? `${maturityYear(q.designation)}-12-31` : undefined,
    lastCouponOn: undefined,
    nominal: isBond ? (q.nominalRemaining ?? 10_000) : 1,
    couponRate: isBond ? couponFromDesignation(q.designation) : undefined,
    commissionPct: MARKET_DEFAULT_COMMISSION[q.instrument],
    market: "BVMAC",
    instrument: q.instrument,
    lotSize: 1,
    settlementDays: 3,
    version: 0,
  };
  return {
    ...base,
    isin: q.isin,
    documents: [{ name: "Bulletin Officiel de la Cote", meta: `BOC n° ${bulletinNo} du ${fmtDate(q.sessionDate)} · PDF`, url: bocUrl(q.sessionDate) }, ...companyDocuments(q.isin), ...base.documents.filter((d) => d.name !== "Bulletin Officiel de la Cote" && !d.meta.startsWith("bvm-ac.org"))],
    lastPrice: q.close,
    lastPriceOn: q.sessionDate,
    dividendPerShare: q.lastDividend ?? base.dividendPerShare,
    pricedAt: new Date().toISOString(),
    priceSource: "boc",
    priceNote: source,
    nominal: isBond && q.nominalRemaining ? q.nominalRemaining : base.nominal,
    version: base.version + 1,
  };
}

/** An OPCVM line of the Guichet: information only until the desk records a distribution agreement. */
export function offerFromNav(n: FundNav, bulletinNo: number, existing?: Offer): Offer {
  const geo = COUNTRY_OF_DEPOSITARY(n.depositary);
  const base: Offer = existing ?? {
    id: `fund-${n.fundKey}`,
    kind: "FONDS",
    operation: "opcvm",
    country: geo.country,
    countryName: geo.name,
    issuer: prettyName(n.manager),
    title: n.name.replace(/^(FCPE|FCP|SICAV)\s+(.*)$/, (_, k: string, rest: string) => `${k} ${prettyName(rest)}`),
    isin: n.fundKey,
    status: "published",
    hidden: true,
    blurb: `${n.name} — fonds ${FUND_WORD[n.category] ?? ""} géré par ${prettyName(n.manager)}, dépositaire ${prettyName(n.depositary)}. Valeur liquidative ${FREQ_WORD[n.frequency] ?? ""} publiée au Bulletin Officiel de la Cote (source : sociétés de gestion agréées COSUMAF).`,
    documents: [],
    opensAt: `${n.inceptionDate}T09:00:00`,
    deadlineAt: "2099-12-31T17:00:00",
    settleOn: n.navDate,
    nominal: 1,
    commissionPct: 0,
    version: 0,
  };
  const prior = base.fund;
  return {
    ...base,
    fund: {
      key: n.fundKey,
      manager: n.manager,
      depositary: n.depositary,
      category: n.category,
      frequency: n.frequency,
      nav: n.nav,
      navDate: n.navDate,
      navOrigin: n.navOrigin,
      inceptionDate: n.inceptionDate,
      perfSinceInceptionPct: n.perfSinceInceptionPct,
      variationPct: n.variationPct,
      distributed: prior?.distributed ?? false,
      agreementRef: prior?.agreementRef,
      entryFeePct: prior?.entryFeePct ?? 0,
      exitFeePct: prior?.exitFeePct ?? 0,
      minAmount: prior?.minAmount ?? 100_000,
      cutoff: prior?.cutoff,
      settlementDays: prior?.settlementDays,
      registerNote: prior?.registerNote,
    },
    commissionPct: prior?.entryFeePct ?? base.commissionPct,
    documents: [{ name: "Bulletin Officiel de la Cote", meta: `BOC n° ${bulletinNo} du ${fmtDate(n.sessionDate)} · PDF`, url: bocUrl(n.sessionDate) }, ...base.documents.filter((d) => d.name !== "Bulletin Officiel de la Cote")],
    lastPrice: n.nav,
    lastPriceOn: n.navDate,
    pricedAt: new Date().toISOString(),
    priceSource: "boc",
    version: base.version + 1,
  };
}
const FUND_WORD: Record<string, string> = { M: "monétaire", O: "obligataire", D: "diversifié", A: "actions" };
const FREQ_WORD: Record<string, string> = { quotidienne: "quotidienne", hebdomadaire: "hebdomadaire", mensuelle: "mensuelle", trimestrielle: "trimestrielle" };
const COUNTRY_OF_DEPOSITARY = (d: string): { country: Country; name: string } => {
  const u = d.toUpperCase();
  if (/GABON/.test(u)) return { country: "Gabon", name: "Gabon · OPCVM" };
  if (/CONGO|LCB/.test(u)) return { country: "Congo", name: "Congo · OPCVM" };
  if (/TCHAD/.test(u)) return { country: "Tchad", name: "Tchad · OPCVM" };
  if (/CENTRAFRIQUE/.test(u)) return { country: "RCA", name: "RCA · OPCVM" };
  if (/GUINEA|GUINEE/.test(u)) return { country: "Guinée éq.", name: "Guinée équatoriale · OPCVM" };
  return { country: "Cameroun", name: "Cameroun · OPCVM" };
};

/* ---------------- ingestion ---------------- */

export async function ingestBoc(opts: { sessionDate: string; bytes?: Uint8Array; sourceUrl?: string; by: MarketBulletin["ingestedBy"]; keepPdf?: boolean }): Promise<IngestResult> {
  const r = repo();
  let bytes = opts.bytes;
  let sourceUrl = opts.sourceUrl;
  if (!bytes) {
    const got = await fetchBoc(opts.sessionDate);
    if (!got) return { found: false, created: [], refreshed: [] };
    bytes = got.bytes;
    sourceUrl = got.url;
  }

  const text = await pdfText(bytes);
  const parsed = parseBoc(text);
  const sessionDate = parsed.sessionDate || opts.sessionDate;
  const fileKey = opts.keepPdf === false ? undefined : `boc/BOC-${sessionDate.replace(/-/g, "")}.pdf`;
  if (fileKey) await saveSource(fileKey, bytes, "application/pdf");

  if (!parsed.bulletinNo) {
    const bulletin: MarketBulletin = { id: sessionDate, number: 0, sessionDate, sourceUrl, fileKey, ingestedAt: new Date().toISOString(), ingestedBy: opts.by, status: "echec", counts: { equities: 0, bonds: 0, funds: 0 }, warnings: parsed.warnings, anomalies: ["En-tête du bulletin non reconnu : aucun cours n'a été retenu."], notices: [] };
    await r.upsertBulletin(bulletin);
    await r.logEvent({ kind: "desk", html: `<b>Bulletin BVMAC</b> du ${fmtDate(sessionDate)} : lecture impossible — cours non mis à jour, vérifier le PDF dans Marché.` });
    return { found: true, bulletin, created: [], refreshed: [], error: "En-tête non reconnu" };
  }

  const quotes = [...parsed.equities.map((e) => equityQuote(e, parsed)), ...parsed.bonds.map((o) => bondQuote(o, parsed))];
  const navs = parsed.funds.map((f) => fundNav(f, parsed));
  // Reference = the session right before this one (during a backfill the "latest" quotes may be months later).
  const prevDate = (await r.listBulletins(2000)).map((b) => b.sessionDate).filter((d) => d < sessionDate).sort().pop();
  const previous = prevDate ? await r.quotesOn(prevDate) : [];
  const anomalies = validate(parsed, quotes, navs, previous);
  const already = await r.getBulletin(sessionDate);

  await r.upsertQuotes(quotes);
  await r.upsertFundNavs(navs);

  // Listed lines: refresh the price of every line we know, create the ones we do not.
  const offers = await r.listOffers();
  const byIsin = new Map(offers.filter((o) => o.kind === "MARCHE").map((o) => [o.isin.replace(/\s/g, "").toUpperCase(), o]));
  const created: string[] = [];
  const refreshed: string[] = [];
  for (const q of quotes) {
    const existing = byIsin.get(q.isin);
    if (existing && existing.lastPriceOn && existing.lastPriceOn > q.sessionDate && existing.priceSource === "boc") continue; // newer bulletin already applied
    const next = offerFromQuote(q, parsed.bulletinNo, existing);
    await r.upsertOffer(next);
    (existing ? refreshed : created).push(next.id);
  }

  // OPCVM lines: NAV refreshed, terms kept; new funds arrive hidden (information only until an agreement exists).
  const byKey = new Map(offers.filter((o) => o.kind === "FONDS" && o.fund).map((o) => [o.fund!.key, o]));
  for (const n of navs) {
    const existing = byKey.get(n.fundKey);
    if (existing && existing.fund && existing.fund.navDate > n.navDate) continue;
    const next = offerFromNav(n, parsed.bulletinNo, existing);
    await r.upsertOffer(next);
    (existing ? refreshed : created).push(next.id);
  }

  const status: MarketBulletin["status"] = anomalies.length || parsed.warnings.length ? "partiel" : "ok";
  const bulletin: MarketBulletin = {
    id: sessionDate,
    number: parsed.bulletinNo,
    sessionDate,
    sourceUrl,
    fileKey,
    ingestedAt: new Date().toISOString(),
    ingestedBy: opts.by,
    status,
    indexValue: parsed.index?.value,
    indexVariationPct: parsed.index?.variationPct,
    counts: { equities: parsed.equities.length, bonds: parsed.bonds.length, funds: parsed.funds.length },
    warnings: parsed.warnings,
    anomalies,
    notices: parsed.notices,
  };
  await r.upsertBulletin(bulletin);

  if (!already) {
    const idx = parsed.index ? ` · BVMAC All Share ${fmt(parsed.index.value)} (${parsed.index.variationPct >= 0 ? "+" : ""}${parsed.index.variationPct.toFixed(2).replace(".", ",")} %)` : "";
    const flag = anomalies.length ? ` — <b>${anomalies.length} anomalie${anomalies.length > 1 ? "s" : ""} à vérifier</b>` : "";
    const newLines = created.filter((id) => id.startsWith("boc-")).length;
    const newFunds = created.filter((id) => id.startsWith("fund-")).length;
    await r.logEvent({ kind: "desk", html: `<b>Bulletin BVMAC n° ${parsed.bulletinNo}</b> du ${fmtDate(sessionDate)} ingéré : ${parsed.equities.length} actions, ${parsed.bonds.length} obligations, ${parsed.funds.length} OPCVM${idx}${newLines ? ` · ${newLines} nouvelle(s) ligne(s) cotée(s)` : ""}${newFunds ? ` · ${newFunds} fonds ajouté(s) (sur demande)` : ""}${flag}` });
    for (const n of parsed.notices) await r.logEvent({ kind: "desk", html: `<b>Avis BVMAC</b> (BOC n° ${parsed.bulletinNo}) : ${n.replace(/</g, "&lt;")}` });
  }
  return { found: true, bulletin, created, refreshed };
}

/** Sessions to try for a daily run: today, then the previous business days not yet ingested (holidays, late publication). */
export async function catchUp(by: MarketBulletin["ingestedBy"], today = new Date(), lookbackDays = 7): Promise<IngestResult[]> {
  const to = localIso(today);
  const from = new Date(today);
  from.setDate(from.getDate() - lookbackDays);
  return backfill(by, localIso(from), to, true);
}

/** Every business day of [from, to] not yet ingested, oldest first — history for charts and reports (PDFs kept only when asked). */
export async function backfill(by: MarketBulletin["ingestedBy"], from: string, to: string, keepPdf = false): Promise<IngestResult[]> {
  const r = repo();
  const results: IngestResult[] = [];
  const known = new Set((await r.listBulletins(2000)).map((b) => b.sessionDate));
  for (let d = new Date(`${from}T12:00:00`); localIso(d) <= to; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const iso = localIso(d);
    if (known.has(iso)) continue;
    try {
      results.push({ ...(await ingestBoc({ sessionDate: iso, by, keepPdf })), sessionDate: iso });
    } catch (e) {
      results.push({ found: true, created: [], refreshed: [], sessionDate: iso, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
