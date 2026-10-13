import "server-only";
import type { Country, Offer } from "@/lib/domain/types";
import { fundKey, valeurHorsLimites, type BulletinNote, type FundNav, type MarketBulletin, type Quote, tradedSession } from "@/lib/domain/market";
import { repo } from "@/lib/data";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { parseDate } from "@/lib/finance";
import { saveSource } from "@/lib/intake/storage";
import { parseBoc, type BocBond, type BocEquity, type BocFund, type BocParsed } from "./boc-parse";
import { completerObligations } from "./boc-geometrie";
import { jugerLaVl, MOTIF_VL } from "./vl-coquille";
import { VERSION_DU_LECTEUR } from "./lecteur-version";
import { prettyName } from "./names";
import type { Company } from "@/data/companies";
import { loadCompanies, loadRegistry } from "@/lib/reference";
import { bondTerms, SANS_CLOTURE } from "@/lib/domain/status";
import { TOLERANCE_AN, variationSurMois } from "@/lib/domain/fund-perf";
import { ABSENCE_SESSIONS, reconcileLines } from "./reconcile";

const COMPANY_DOC_LABEL: Record<string, string> = { fiche: "Fiche signalétique", etats_ohada: "États financiers OHADA", etats_ifrs: "États financiers IFRS", rapport_gestion: "Rapport de gestion", rapport_semestriel: "Rapport semestriel", note_information: "Note d'information", autre: "Document" };
/** The issuer's own filings at the BVMAC, newest first, for the fiche of a listed share. */
function companyDocuments(isin: string, companies: Company[]): Offer["documents"] {
  const c = companies.find((x) => x.isin === isin);
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
/** No commission is shown or charged for now : the desk communicates its terms to clients who reach out. */
export const MARKET_DEFAULT_COMMISSION: Record<Quote["instrument"], number> = { action: 0, obligation: 0 };

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

/**
 * LA MÊME SUITE DE LETTRES DÉSIGNE LE MÊME FONDS, quelle que soit la place
 * des espaces.
 *
 * La clef se fabrique du nom, donc elle suit son orthographe. Le 7 août 2023
 * la bourse a écrit DANS LE MÊME BULLETIN « FCP BGFI Bank ATLAS » à la table
 * quotidienne et « FCP BGFIBank ATLAS » à l'hebdomadaire : une espace, deux
 * clefs, deux fonds. Dès le surlendemain elle n'en écrivait plus qu'une, si
 * bien que le vrai fonds a poursuivi sa série et que le jumeau est resté
 * publié trois ans avec la VL de ce jour-là.
 *
 * On ne réécrit pas les clefs existantes pour autant : une clef est aussi
 * une adresse, `/offres/fund-<clef>`, et la changer casserait les liens
 * partagés pour un défaut survenu une fois en trois ans. On reconnaît donc
 * au lieu de renommer : si un fonds connu porte la même suite de lettres et
 * de chiffres, c'est lui, et sa clef est gardée.
 */
export const memeNom = (nom: string): string => fundKey(nom).replace(/-/g, "");

export function fundNav(f: BocFund, b: BocParsed, clefConnue?: (nom: string) => string | undefined): FundNav {
  const fin = (v: number | undefined) => (v != null && Number.isFinite(v) ? v : undefined);
  return {
    fundKey: clefConnue?.(f.name) ?? fundKey(f.name), name: f.name, manager: f.manager, depositary: f.depositary, category: f.category, frequency: f.frequency, navDate: f.navDate, nav: f.nav,
    previousNav: fin(f.previousNav), previousDate: f.previousDate, navOrigin: f.navOrigin, inceptionDate: f.inceptionDate, perfSinceInceptionPct: f.perfSinceInceptionPct,
    variationPct: fin(f.variationPct), variationMonthlyPct: fin(f.variationMonthlyPct), variationQuarterlyPct: fin(f.variationQuarterlyPct), bulletinNo: b.bulletinNo, sessionDate: b.sessionDate,
  };
}

/* ---------------- validation ---------------- */

/** What was read but looks wrong : the desk sees these before trusting the day's prices. */
/**
 * DEUX LISTES, PARCE QUE DEUX CHOSES DIFFÉRENTES SE DISENT ICI.
 *
 * `anomalies` annonce qu'une séance MANQUE DE MATIÈRE : une section courte,
 * des lignes disparues, une écriture refusée. Le desk doit la rouvrir.
 *
 * `avertissements` signale une valeur qui est BIEN EN BASE et qui mérite un
 * œil : un fonds qui bondit de plus de dix pour cent, un cours qui s'écarte
 * du précédent. Rien ne manque, rien n'est à rouvrir.
 *
 * LES DEUX SE CONFONDAIENT, et cela envoyait le desk rouvrir une séance
 * entière parce qu'un fonds avait bougé de douze pour cent, alors que sa
 * valeur liquidative était écrite, juste, et signalée. Georges l'a demandé le
 * 13 octobre 2026 : accepter ces valeurs et les porter au journal, pas au
 * tableau des manques. Le barème des familles le déclare désormais (voir
 * `sort` dans remarques.ts), et un cliquet refuse qu'une anomalie annonce une
 * donnée pourtant écrite.
 */
export function validate(parsed: BocParsed, quotes: Quote[], navs: FundNav[], previous: Quote[], prevNavs = 0): { anomalies: string[]; avertissements: string[] } {
  const out: string[] = [];
  /** Ce qui est écrit en base et seulement signalé : familles N et Q. */
  const vu: string[] = [];
  const prevBy = new Map(previous.map((q) => [q.isin, q]));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.sessionDate)) out.push("Date de séance illisible.");
  /**
   * CE QUE LA SÉANCE PRÉCÉDENTE A RENDU, ET NON UN NOMBRE FIGÉ.
   *
   * Les seuils étaient écrits en dur (5 actions, 20 obligations, 20 OPCVM),
   * réglés sur la cote du jour où ils ont été écrits. La cote grandit : 10
   * obligations en 2023, 15 en 2024, 27 en 2025, 32 en 2026. Remonter
   * l'historique a donc fait crier « section incomplète » sur deux années
   * entières où la lecture était juste.
   *
   * La question utile n'est pas « combien », c'est « moins qu'hier ». Une
   * obligation ou un fonds peut sortir de la cote du jour au lendemain, d'où
   * la tolérance d'une unité ; une action qui disparaît est toujours une
   * anomalie, et c'est elle qui aurait signalé SOCAPALM dès 2024.
   *
   * Sans séance précédente (première ingestion, reprise après un trou), on
   * retombe sur un plancher bas : mieux vaut se taire que crier à tort.
   */
  const avant = { action: 0, obligation: 0 };
  for (const q of previous) avant[q.instrument] += 1;
  const manque = (lu: number, hier: number, plancher: number, tolerance: number) => (hier > 0 ? lu < hier - tolerance : lu < plancher);
  if (manque(parsed.equities.length, avant.action, 4, 0)) out.push(`Seulement ${parsed.equities.length} action(s) lue(s)${avant.action ? ` contre ${avant.action} la séance précédente` : ""} : la section semble incomplète.`);
  if (manque(parsed.bonds.length, avant.obligation, 8, 1)) out.push(`Seulement ${parsed.bonds.length} obligation(s) lue(s)${avant.obligation ? ` contre ${avant.obligation} la séance précédente` : ""} : la section semble incomplète.`);
  if (manque(navs.length, prevNavs, 10, 1)) out.push(`Seulement ${navs.length} OPCVM lu(s)${prevNavs ? ` contre ${prevNavs} la séance précédente` : ""} : la table semble incomplète.`);
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
      if (move > 15) vu.push(`${label} : ${move.toFixed(1)} % d'écart avec le dernier cours ingéré (${p.close} le ${fmtDate(p.sessionDate)}).`);
    }
  }
  const known = new Set(previous.map((q) => q.isin));
  const missing = [...known].filter((isin) => !quotes.some((q) => q.isin === isin));
  if (known.size && missing.length) out.push(`Lignes présentes au bulletin précédent et absentes aujourd'hui : ${missing.join(", ")}.`);
  for (const n of navs) {
    if (!(n.nav > 0)) out.push(`${n.name} : VL nulle ou illisible.`);
    if (n.navDate > parsed.sessionDate) out.push(`${n.name} : date de VL postérieure à la séance.`);
    /* LA VL BONDIT, ET ON LA GARDE. Elle est écrite en base, elle l'a
       toujours été : seule l'étiquette changeait de côté. Au journal, donc,
       et non au tableau des manques. */
    if (n.previousNav && Math.abs(n.nav / n.previousNav - 1) > 0.1) vu.push(`${n.name} : VL ${fmt(n.nav)} vs ${fmt(n.previousNav)} précédente (> 10 %).`);
  }
  return { anomalies: out, avertissements: vu };
}

/* ---------------- listed lines of the Guichet ---------------- */

const couponFromDesignation = (d: string): number | undefined => {
  const m = d.match(/(\d+(?:[.,]\d+)?)\s?%/);
  return m ? Number(m[1].replace(",", ".")) : undefined;
};
const maturityYear = (d: string): string | undefined => d.match(/\b(\d{4})\s*-\s*(\d{4})\b/)?.[2];

export function offerFromQuote(q: Quote, bulletinNo: number, existing?: Offer, companies: Company[] = []): Offer {
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
    title: isBond ? `${prettyName(q.issuer)} · ${q.designation.replace(/(\d)\.(\d)/, "$1,$2").replace(/%/, " %")}` : `${q.mnemo} : ${prettyName(q.issuer)}`,
    isin: q.isin,
    status: "published",
    blurb: isBond
      ? `Obligation cotée à la BVMAC (${q.mnemo}). Ordres d'achat et de vente au cours du jour, coupon couru réglé au prorata, règlement T+3.`
      : `Action cotée à la BVMAC (${q.mnemo}). Ordres d'achat et de vente exécutés au marché ou à cours limité, règlement T+3.`,
    documents: [{ name: "Bulletin Officiel de la Cote", meta: `BOC n° ${bulletinNo}`, url: bocUrl(q.sessionDate) }],
    opensAt: `${q.sessionDate}T09:00:00`,
    deadlineAt: SANS_CLOTURE,
    settleOn: q.sessionDate,
    maturityOn: isBond ? (bondTerms(q.isin)?.maturityOn ?? (maturityYear(q.designation) ? `${maturityYear(q.designation)}-12-31` : undefined)) : undefined,
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
    documents: [{ name: "Bulletin Officiel de la Cote", meta: `BOC n° ${bulletinNo} du ${fmtDate(q.sessionDate)} · PDF`, url: bocUrl(q.sessionDate) }, ...companyDocuments(q.isin, companies), ...base.documents.filter((d) => d.name !== "Bulletin Officiel de la Cote" && !d.meta.startsWith("bvm-ac.org"))],
    lastPrice: q.close,
    lastPriceOn: q.sessionDate,
    // La clôture est de toutes les séances ; l'échange, non : la date ne bouge que s'il y en a eu un.
    lastTradedOn: tradedSession(q) ? q.sessionDate : base.lastTradedOn,
    // Le prix non plus ne bouge pas à chaque séance : « depuis quand » est une
    // autre question que « à quelle date lu », et c'est celle qui qualifie un
    // cours sur une place où une ligne peut rester un an sans transaction.
    priceSince: base.lastPrice === q.close && base.priceSince ? base.priceSince : q.sessionDate,
    dividendPerShare: q.lastDividend ?? base.dividendPerShare,
    pricedAt: new Date().toISOString(),
    priceSource: "boc",
    priceNote: source,
    nominal: isBond && q.nominalRemaining ? q.nominalRemaining : base.nominal,
    maturityOn: isBond ? (bondTerms(q.isin)?.maturityOn ?? base.maturityOn) : base.maturityOn,
    version: base.version + 1,
  };
}

/** An OPCVM line of the Guichet: information only until the desk records a distribution agreement. */
/**
 * La VL d'il y a un an (la plus proche en deçà, à 45 jours près) → les douze
 * mois.
 *
 * ELLE NE SE CALCULE PLUS ICI. Cette fonction écrivait mot pour mot la règle
 * de « variationSurMois », avec ses douze mois et sa tolérance, et la liste
 * des fonds allait en avoir besoin pour trois autres fenêtres. Deux écritures
 * de la même règle, c'est une qui dérive. Il ne reste que le nom, parce que
 * l'ingestion le connaît, et la forme de son résultat.
 */
export function perf1y(history: FundNav[], to: FundNav): { pct: number; from: string } | undefined {
  const v = variationSurMois(history, to, 12, TOLERANCE_AN);
  return v && { pct: v.pct, from: v.depuis };
}

/**
 * UNE DATE DE CRÉATION NE RECULE PAS DANS LE TEMPS, ELLE N'AVANCE PAS.
 *
 * Mesuré le 4 octobre 2026 : à partir du bulletin n° 2551 (séance du 10
 * juillet 2026), cinq fonds d'Africa Bright — AB Cash, AB Diversifié, AB
 * Invest, Cap Obligations, Performance — ont vu leur date de création passer
 * à « 10 juillet 2026 », c'est-à-dire À LA DATE DE CE BULLETIN. Les
 * quarante-cinq bulletins précédents donnaient 2021-08-19, 2023-09-18,
 * 2021-08-19, 2022-03-25 et 2022-08-11, et nos propres VL pour ces fonds
 * remontent au 29 août 2025.
 *
 * L'écran disait donc, sur la même carte, « +27,39 % depuis l'origine » et
 * « depuis le 10 juil. 2026 » — un fonds obligataire qui aurait gagné vingt-
 * sept pour cent en dix semaines — avec, à côté, une performance sur douze
 * mois qu'un fonds de dix semaines ne peut pas avoir. Les chiffres étaient
 * bons ; c'est la date qui mentait, et c'est elle qui rendait les chiffres
 * absurdes.
 *
 * La règle est donc celle d'un fait passé : on garde la PLUS ANCIENNE date
 * jamais publiée pour ce fonds. Elle vient du même bulletin, elle est sourcée,
 * et c'est la seule qui s'accorde avec les performances. Les lignes de
 * « fund_navs », elles, gardent ce que le bulletin a dit : on ne récrit pas la
 * source, on en tire ce qui se tient.
 */
export const dateDeCreation = (publiee: string, connue?: string): string => (connue && connue < publiee ? connue : publiee);

export function offerFromNav(n: FundNav, bulletinNo: number, existing?: Offer, yearAgo?: { pct: number; from: string }): Offer {
  const geo = COUNTRY_OF_DEPOSITARY(n.depositary);
  const naissance = dateDeCreation(n.inceptionDate, existing?.fund?.inceptionDate);
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
    hidden: false,
    blurb: `${n.name} : fonds ${FUND_WORD[n.category] ?? ""} géré par ${prettyName(n.manager)}, dépositaire ${prettyName(n.depositary)}. Valeur liquidative ${FREQ_WORD[n.frequency] ?? ""} publiée au Bulletin Officiel de la Cote (source : sociétés de gestion agréées COSUMAF).`,
    documents: [],
    opensAt: `${naissance}T09:00:00`,
    deadlineAt: SANS_CLOTURE,
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
      inceptionDate: naissance,
      perfSinceInceptionPct: n.perfSinceInceptionPct,
      variationPct: n.variationPct,
      perf1yPct: yearAgo?.pct ?? prior?.perf1yPct,
      perf1yFrom: yearAgo?.from ?? prior?.perf1yFrom,
      distributed: prior?.distributed ?? true,
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
  /* LE DERNIER NOMINAL NON NUL DE CHAQUE LIGNE, avant de lire.
     Sur une obligation amortissable, le prix n'est pas rapporté au nominal du
     jour mais à celui qui courait avant le remboursement du capital, et deux
     lignes sur trois impriment même un nominal nul. Le lecteur ne trouvait
     alors aucune découpe (« prix / nominal ambigus », 78 remarques sur 66
     séances) alors que le nombre qui lui manquait dormait en base depuis le
     premier jour.
     LA DERNIÈRE LECTURE DE LA LIGNE, PAS LA VEILLE DU CALENDRIER : quand une
     ligne échoue un jour, elle n'a plus de référence le lendemain, donc elle
     échoue encore, et la panne se propage toute seule. Mesuré : quatre cas
     sur neuf se perdaient ainsi. */
  const nominauxDeReference = await r.nominauxDeReference(opts.sessionDate);
  const parsed = parseBoc(text, nominauxDeReference);
  const rattrapees = await completerObligations(parsed, bytes, nominauxDeReference);
  const sessionDate = parsed.sessionDate || opts.sessionDate;
  /* « NE PAS GARDER » N EST PAS « OUBLIER ». Cette ligne écrivait undefined
     dès que keepPdf était faux, donc une relecture effaçait le pointeur d'une
     séance dont le PDF est bel et bien dans le seau : 104 fichiers archivés,
     et des séances sans pointeur en face. Le fichier restait, plus personne ne
     savait qu'il existait. On ne crée pas d'archive ici, et on ne détruit pas
     celle d'avant. */
  const dejaGarde = opts.keepPdf === false ? (await r.getBulletin(sessionDate).catch(() => undefined))?.fileKey : undefined;
  const fileKey = opts.keepPdf === false ? dejaGarde : `boc/BOC-${sessionDate.replace(/-/g, "")}.pdf`;
  /* On n'écrit que si c'est NOUS qui créons l'archive : un pointeur hérité
     désigne un fichier déjà en place, le réécrire ne ferait que dépenser. */
  if (fileKey && opts.keepPdf !== false) await saveSource(fileKey, bytes, "application/pdf");

  if (!parsed.bulletinNo) {
    /* CE QUI EST JETÉ ICI SE DIT, et c'est le cas du 4 janvier 2023 : six
       actions et neuf obligations parfaitement lues, toutes écartées parce
       que l'en-tête ne correspond à aucun motif connu. Le bulletin s'écrivait
       « 0 action » sans que rien ne dise qu'il y en avait eu six, et on a donc
       relu cette séance pendant des mois en croyant que le lecteur n'y
       trouvait rien. */
    const jete = parsed.equities.length + parsed.bonds.length + parsed.funds.length;
    const notes: BulletinNote[] = [
      ...parsed.notes,
      ...(jete
        ? [{ message: `Lecture écartée faute d'en-tête : ${parsed.equities.length} action(s), ${parsed.bonds.length} obligation(s) et ${parsed.funds.length} OPCVM avaient pourtant été lus.`, attendu: "BULLETIN OFFICIEL DE LA COTE N° <numéro> DU <jj/mm/aaaa>" }]
        : []),
    ];
    const bulletin: MarketBulletin = { id: sessionDate, number: 0, sessionDate, sourceUrl, fileKey, ingestedAt: new Date().toISOString(), ingestedBy: opts.by, status: "echec", counts: { equities: 0, bonds: 0, funds: 0 }, warnings: parsed.warnings, anomalies: ["En-tête du bulletin non reconnu : aucun cours n'a été retenu."], notices: [], notes, readerVersion: VERSION_DU_LECTEUR };
    await r.upsertBulletin(bulletin);
    await r.logEvent({ kind: "desk", html: `<b>Bulletin BVMAC</b> du ${fmtDate(sessionDate)} : lecture impossible : cours non mis à jour, vérifier le PDF dans Marché.` });
    return { found: true, bulletin, created: [], refreshed: [], error: "En-tête non reconnu" };
  }

  const [companies] = await Promise.all([loadCompanies(), loadRegistry()]); // exact bond schedules + issuer documents from the desk's reference data
  /**
   * UNE VALEUR QUE LA BASE NE PEUT PAS CONTENIR N'EST PAS UNE VALEUR.
   *
   * Les colonnes de cotation sont des numeric(18,2) : seize chiffres devant
   * la virgule. Le 22 décembre 2023, la ligne BANGE sort du lecteur avec une
   * ouverture à vingt-et-un chiffres, parce que quatre montants à séparateurs
   * d'espace se sont collés. L'écriture étant tout-ou-rien, cette seule ligne
   * emportait les cinq autres, et la séance restait à zéro action pendant
   * deux ans.
   *
   * Le lecteur l'écarte donc lui-même, et LE DIT : rendre la ligne à la base
   * pour qu'elle la refuse coûtait toute la séance ; l'écarter en silence
   * serait pire encore, puisque personne ne saurait qu'une ligne manque.
   */
  const quotes: Quote[] = [];
  for (const q of [...parsed.equities.map((e) => equityQuote(e, parsed)), ...parsed.bonds.map((o) => bondQuote(o, parsed))]) {
    const faute = valeurHorsLimites(q);
    if (!faute) {
      quotes.push(q);
      continue;
    }
    const message = `Écriture refusée d'avance : ${q.isin} porte une valeur hors des limites de la base (${faute}). La ligne est écartée, les autres entrent.`;
    parsed.warnings.push(message);
    parsed.notes.push({ message, attendu: "un nombre tenant sur seize chiffres devant la virgule" });
  }
  /**
   * CHAQUE VL EST JUGÉE, ET LE MOTIF SE NOMME.
   *
   * Le message d'avant disait « date ou valeur invraisemblable » pour les
   * quatre règles à la fois. Mesuré le 12 octobre 2026 sur les 89 VL écartées
   * que la base garde : 56 précédaient la création du fonds, 20 devançaient la
   * séance, 6 étaient trop anciennes, et ZÉRO portait une valeur fautive. Le
   * message parlait de valeur dans 89 cas sur 89 où aucune n'était en cause.
   *
   * La coquille d'année se répare au passage, et elle se dit : voir
   * vl-coquille.ts pour les trois bornes qui tiennent cette réparation
   * honnête.
   */
  const retenues: FundNav[] = [];
  const plausible = (n: FundNav): boolean => {
    const v = jugerLaVl(n, sessionDate);
    if (v.coquille && v.garde) {
      const message = `OPCVM ${n.name} : année de la VL corrigée, ${v.coquille} lue comme ${v.garde.navDate}.`;
      /* EN NOTE, JAMAIS EN AVERTISSEMENT. Un avertissement laisserait la
         séance « partielle » pour un défaut déjà corrigé, et c'est la question
         périmée qu'on passe son temps à retirer des écrans du desk. */
      parsed.notes.push({ message, brut: v.coquille, attendu: `une date postérieure au ${n.inceptionDate}, création annoncée du fonds` });
    }
    if (v.garde) {
      retenues.push(v.garde);
      return true;
    }
    parsed.warnings.push(`OPCVM ${n.name} : VL du ${n.navDate} ignorée : ${MOTIF_VL[v.motif ?? "vieille"]}.`);
    return false;
  };
  /* Une orthographe nouvelle rejoint le fonds qu'elle désigne, au lieu d'en
     créer un second : c'est ici, à l'entrée, que le jumeau se prévient. */
  const connus = new Map((await r.latestFundNavs().catch(() => [])).map((n) => [memeNom(n.name), n.fundKey]));
  /* LA LISTE RETENUE EST CELLE QUE LE JUGE A REMPLIE, et non celle qu on
     filtre : une VL dont l année a été réparée doit s écrire CORRIGÉE, et un
     filtre rendrait l originale. */
  parsed.funds.map((f) => fundNav(f, parsed, (nom) => connus.get(memeNom(nom)))).forEach(plausible);
  const navs = retenues;
  // Reference = the session right before this one (during a backfill the "latest" quotes may be months later).
  const prevDate = (await r.listBulletins(2000)).map((b) => b.sessionDate).filter((d) => d < sessionDate).sort().pop();
  const previous = prevDate ? await r.quotesOn(prevDate) : [];
  /* Le compte des VL de la veille vient du bulletin précédent : les cotations
     ne portent pas les OPCVM. */
  const avantHier = prevDate ? await r.getBulletin(prevDate).catch(() => undefined) : undefined;
  /* Les deux listes : ce qui MANQUE va aux anomalies, ce qui est ÉCRIT et
     seulement signalé rejoint les avertissements du lecteur. */
  const { anomalies, avertissements } = validate(parsed, quotes, navs, previous, avantHier?.counts?.funds ?? 0);
  parsed.warnings.push(...avertissements);
  const already = await r.getBulletin(sessionDate);

  /* LIRE ET ENREGISTRER NE SONT PAS LE MÊME MOMENT.
     Ces deux lignes levaient, et tout le reste de la fonction était emporté :
     le bulletin n'était jamais réécrit, donc la séance gardait éternellement
     le compte rendu de sa PREMIÈRE lecture. Le 22 décembre 2023, elle annonce
     « Seulement 0 action(s) lue(s) » alors que le lecteur en lit cinq sur six
     depuis des mois ; la base refuse une ligne dont l'ouverture sort à
     vingt-et-un chiffres, et l'écriture tout-ou-rien emporte les quatre
     bonnes. Le desk lisait une accusation contre la lecture, et n'avait
     d'autre choix que de signer un motif faux sur le document.
     ON N'ÉCRIT RIEN DE PLUS POUR AUTANT : si les cotations sont refusées, les
     lignes cotées ne sont pas rafraîchies non plus, sinon on publierait un
     prix dont la cotation n'existe pas. Seul le bulletin est écrit, et il dit
     la vérité : ce que le lecteur a lu, et que la base l'a refusé. */
  let refusDEcriture: string | undefined;
  try {
    await r.upsertQuotes(quotes);
    await r.upsertFundNavs(navs);
  } catch (e) {
    refusDEcriture = e instanceof Error ? e.message : "cause inconnue";
  }

  if (refusDEcriture) {
    const bulletin: MarketBulletin = {
      id: sessionDate,
      number: parsed.bulletinNo,
      sessionDate,
      sourceUrl,
      fileKey,
      ingestedAt: new Date().toISOString(),
      ingestedBy: opts.by,
      status: "echec",
      indexValue: parsed.index?.value,
      indexVariationPct: parsed.index?.variationPct,
      /* Les comptes disent ce que le LECTEUR a lu, et c'est leur sens depuis
         toujours. Y mettre zéro parce que la base a refusé ferait accuser la
         lecture une seconde fois. */
      counts: { equities: parsed.equities.length, bonds: parsed.bonds.length, funds: parsed.funds.length },
      warnings: parsed.warnings,
      /* Les anomalies DÉRIVÉES sont écartées : « vingt lignes absentes depuis
         la veille » est la conséquence d'un seul refus, pas vingt faits, et
         les présenter côte à côte fait répondre vingt fois à une question. */
      anomalies: [`Écriture refusée par la base : ${refusDEcriture}. Le lecteur avait lu ${parsed.equities.length} action(s), ${parsed.bonds.length} obligation(s) et ${parsed.funds.length} OPCVM.`],
      notices: parsed.notices,
      notes: parsed.notes,
      readerVersion: VERSION_DU_LECTEUR,
    };
    await r.upsertBulletin(bulletin);
    await r.logEvent({ kind: "system", html: `<b>Bulletin BVMAC</b> du ${fmtDate(sessionDate)} : lecture réussie, écriture refusée (${refusDEcriture.replace(/</g, "&lt;")}). Les cours ne sont pas entrés.` });
    return { found: true, bulletin, created: [], refreshed: [], error: refusDEcriture };
  }

  // Listed lines: refresh the price of every line we know, create the ones we do not.
  const offers = await r.listOffers();
  const byIsin = new Map(offers.filter((o) => o.kind === "MARCHE").map((o) => [o.isin.replace(/\s/g, "").toUpperCase(), o]));
  const created: string[] = [];
  const refreshed: string[] = [];
  for (const q of quotes) {
    const existing = byIsin.get(q.isin);
    if (existing && existing.lastPriceOn && existing.lastPriceOn > q.sessionDate && existing.priceSource === "boc") continue; // newer bulletin already applied
    const next = offerFromQuote(q, parsed.bulletinNo, existing, companies);
    await r.upsertOffer(next);
    (existing ? refreshed : created).push(next.id);
  }

  // OPCVM lines: NAV refreshed, terms kept; new funds arrive visible and open to subscription.
  const byKey = new Map(offers.filter((o) => o.kind === "FONDS" && o.fund).map((o) => [o.fund!.key, o]));
  for (const n of navs) {
    const existing = byKey.get(n.fundKey);
    if (existing && existing.fund && existing.fund.navDate > n.navDate) continue;
    const next = offerFromNav(n, parsed.bulletinNo, existing, perf1y(await r.listFundNavs(n.fundKey, 400), n));
    await r.upsertOffer(next);
    (existing ? refreshed : created).push(next.id);
  }

  // Une ligne qui a quitté la cote et dont l'échéance est passée se retire seule :
  // la laisser publiée, c'est la laisser commandable. Les autres absences vont à Santé,
  // où une personne tranche. Jamais pendant la relecture d'une séance ancienne.
  const latest = (await r.listBulletins(1)).map((b) => b.sessionDate)[0];
  if (!latest || sessionDate >= latest) {
    const recent = await r.listBulletins(ABSENCE_SESSIONS);
    const quotesByDate = new Map<string, typeof quotes>();
    for (const b of recent) quotesByDate.set(b.sessionDate, b.sessionDate === sessionDate ? quotes : await r.quotesOn(b.sessionDate));
    const gone = reconcileLines({ offers: await r.listOffers(), bulletins: recent, quotesByDate }).filter((i) => i.kind === "sortie" && i.retirable);
    for (const g of gone) {
      const o = (await r.listOffers()).find((x) => x.id === g.offerId);
      if (!o) continue;
      // « matured », pas « withdrawn » : la maison n'a rien retiré, la ligne a
      // quitté la cote. La page reste consultable avec ses documents et son
      // historique de cours ; elle cesse seulement d'être commandable.
      await r.upsertOffer({ ...o, status: "matured", version: o.version + 1 });
      await r.logEvent({ kind: "desk", html: `<b>Ligne clôturée</b> : ${o.title} · ${g.detail}` });
    }
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
    /* LA MATIÈRE PREMIÈRE DU DIALOGUE. Le lecteur gardait déjà, pour chaque
       difficulté, le texte du PDF qu'il n'a pas su lire, ce qu'il y cherchait
       et sa page ; cette ligne cesse de les jeter. Sans elles le desk lit une
       plainte, avec elles il lit une question à laquelle il peut répondre.
       Les anomalies sortent de la validation et non du lecteur : elles n'ont
       pas de texte brut, donc elles n'ont pas de note. */
    notes: parsed.notes,
    readerVersion: VERSION_DU_LECTEUR,
  };
  await r.upsertBulletin(bulletin);

  if (!already) {
    const idx = parsed.index ? ` · BVMAC All Share ${fmt(parsed.index.value)} (${parsed.index.variationPct >= 0 ? "+" : ""}${parsed.index.variationPct.toFixed(2).replace(".", ",")} %)` : "";
    const flag = anomalies.length ? ` : <b>${anomalies.length} anomalie${anomalies.length > 1 ? "s" : ""} à vérifier</b>` : "";
    const newLines = created.filter((id) => id.startsWith("boc-")).length;
    const newFunds = created.filter((id) => id.startsWith("fund-")).length;
    await r.logEvent({ kind: "desk", html: `<b>Bulletin BVMAC n° ${parsed.bulletinNo}</b> du ${fmtDate(sessionDate)} ingéré : ${parsed.equities.length} actions, ${parsed.bonds.length} obligations, ${parsed.funds.length} OPCVM${idx}${newLines ? ` · ${newLines} nouvelle(s) ligne(s) cotée(s)` : ""}${newFunds ? ` · ${newFunds} fonds ajouté(s) (sur demande)` : ""}${rattrapees.length ? ` · ${rattrapees.length} obligation(s) retrouvée(s) par la lecture géométrique` : ""}${flag}` });
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

/**
 * Chaque jour ouvré de [from, to] non encore lu, du plus ancien au plus
 * récent : l'historique des graphiques et des notes (le PDF n'est gardé que si
 * on le demande).
 *
 * « relire » renverse la règle : on repasse sur les séances DÉJÀ en base. Le
 * rattrapage les saute, et c'est ce qu'il faut tous les soirs ; après une
 * correction du lecteur, c'est exactement l'inverse qu'il faut, et le bouton
 * du desk ne reprend que six séances à la fois.
 */
export async function backfill(by: MarketBulletin["ingestedBy"], from: string, to: string, keepPdf = false, relire = false): Promise<IngestResult[]> {
  const r = repo();
  const results: IngestResult[] = [];
  const known = relire ? new Set<string>() : new Set((await r.listBulletins(2000)).map((b) => b.sessionDate));
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
