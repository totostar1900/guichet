/**
 * Actualités : links to what others publish (Treasuries, the BVMAC, the
 * COSUMAF, the press, listed companies, fund managers), with two lines from
 * the desk on why it matters. Never the article itself: the reader is sent to
 * the original. Its own table `news` (migration 0025): only published items are
 * readable by everyone; drafts, received links and discarded items stay with the desk.
 */

/** Audit entity name for news records. */
export const NEWS_KIND = "news";

export type NewsRubric = "tresors" | "bvmac" | "societes" | "fonds" | "reglementation";
export const RUBRIC_LABEL: Record<NewsRubric, string> = {
  tresors: "Trésors",
  bvmac: "BVMAC",
  societes: "Sociétés",
  fonds: "Fonds",
  reglementation: "Réglementation",
};
export const RUBRICS = Object.keys(RUBRIC_LABEL) as NewsRubric[];

export type NewsStatus = "recu" | "brouillon" | "publiee" | "ecartee";
export const STATUS_LABEL: Record<NewsStatus, string> = { recu: "Reçu", brouillon: "Brouillon", publiee: "Publiée", ecartee: "Écartée" };

export type NewsLinkKind = "offer" | "company" | "issuer" | "term";
export interface NewsLink {
  kind: NewsLinkKind;
  key: string; // offer id · company mnemo · issuer slug · glossary key
  label: string;
}

export interface NewsItem {
  id: string;
  url: string;
  domain: string;
  /** Title as the reader sees it : rewritten for the client, not the page's own. */
  title: string;
  titleEn?: string;
  /** « Pourquoi ça compte » : two lines, no recommendation. */
  why: string;
  whyEn?: string;
  /** Source label: BVMAC, COSUMAF, DGTCP · RCA, Presse… */
  source: string;
  /** What the link is: « PDF · 2 p. », « page », « article ». */
  format?: string;
  publishedAt: string; // ISO, local
  rubric: NewsRubric;
  links: NewsLink[];
  featured: boolean;
  status: NewsStatus;
  /** Last day the item shows on the page (inclusive); archived after. */
  visibleUntil?: string; // YYYY-MM-DD
  /** Where the link came in: « Formulaire », « WhatsApp · A. N. », « E-mail · a@b », « Veille · bvm-ac.org ». */
  receivedFrom?: string;
  /** What the sender wrote with the link, or what the page said about itself. */
  note?: string;
  /** Title read on the page itself (OpenGraph / <title>), kept for reference. */
  pageTitle?: string;
  linkOk?: boolean;
  linkCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  publishedBy?: string;
  version: number;
}

export const DEFAULT_VISIBLE_DAYS = 30;

export const isVisible = (n: NewsItem, now = new Date()): boolean => {
  if (n.status !== "publiee") return false;
  if (!n.visibleUntil) return true;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return n.visibleUntil >= today;
};

export const domainOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/** The source label a domain usually means; the desk can always change it. */
const SOURCE_BY_DOMAIN: [RegExp, string, NewsRubric][] = [
  [/bvm-ac\.org$/, "BVMAC", "bvmac"],
  [/cosumaf\.org$/, "COSUMAF", "reglementation"],
  [/beac\.int$/, "BEAC", "reglementation"],
  [/(tresor|finances)(\.gouv)?\.cf$/, "DGTCP · RCA", "tresors"],
  [/(tresor|finances)(\.gouv)?\.cg$/, "DGTCP · Congo", "tresors"],
  [/(dgtcfm|minfi\.gov|tresor)\.cm$/, "DGTCP · Cameroun", "tresors"],
  [/(tresor|dgtcp|finances)(\.gouv)?\.ga$/, "DGTCP · Gabon", "tresors"],
  [/(tresor|finances)(\.gouv)?\.td$/, "DGTCP · Tchad", "tresors"],
  [/(tresor|hacienda|finances)(\.gouv)?\.gq$/, "DGTCP · Guinée équatoriale", "tresors"],
  [/(jeuneafrique|financialafrik|ecomatin|agenceecofin|lanouvelletribune|cameroon-tribune|investir-au-cameroun|lesechos|ft\.com|bloomberg)/, "Presse", "reglementation"],
];
export function guessSource(domain: string): { source: string; rubric: NewsRubric } {
  for (const [re, source, rubric] of SOURCE_BY_DOMAIN) if (re.test(domain)) return { source, rubric };
  return { source: domain || "Presse", rubric: "reglementation" };
}

export const SOURCE_OPTIONS = ["BVMAC", "COSUMAF", "BEAC", "DGTCP · RCA", "DGTCP · Congo", "DGTCP · Cameroun", "DGTCP · Gabon", "DGTCP · Tchad", "DGTCP · Guinée équatoriale", "Presse", "Société cotée", "Société de gestion"];

/** Sentences the desk writes must inform, never advise: a few words are refused outright. */
const FORBIDDEN = [/\bachetez\b/i, /\bvendez\b/i, /\bsouscrivez\b/i, /\bnous (vous )?recommandons\b/i, /\bconseill(ons|é)\b/i, /\bgaranti(e|s)?\b/i, /\bà ne pas manquer\b/i, /\bopportunité à saisir\b/i];
export function whyProblem(why: string): string | null {
  const w = why.trim();
  if (w.length < 20) return "Deux lignes de lecture sont attendues (20 caractères au moins).";
  if (w.length > 320) return "Deux lignes, pas plus : 320 caractères maximum.";
  const hit = FORBIDDEN.find((re) => re.test(w));
  if (hit) return `« ${w.match(hit)?.[0]} » : la lecture informe, elle ne recommande pas.`;
  return null;
}

/** Pulls URLs out of a chat message (WhatsApp, e-mail body). */
export function urlsIn(text: string): string[] {
  const out = text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  return [...new Set(out.map((u) => u.replace(/[.,;:!?»]+$/, "")))];
}

/** Minimal RSS / Atom reader : enough for the sites we follow, no dependency. */
export function parseFeed(xml: string): { title: string; url: string; publishedAt?: string; summary?: string }[] {
  const items: { title: string; url: string; publishedAt?: string; summary?: string }[] = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  const text = (b: string, tag: string): string | undefined => {
    const m = b.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return m ? decode(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim()) : undefined;
  };
  for (const b of blocks) {
    const title = text(b, "title");
    let url = text(b, "link");
    if (!url) url = b.match(/<link\b[^>]*href="([^"]+)"/i)?.[1];
    if (!title || !url) continue;
    const date = text(b, "pubDate") ?? text(b, "published") ?? text(b, "updated") ?? text(b, "dc:date");
    const summary = text(b, "description") ?? text(b, "summary") ?? text(b, "content");
    const d = date ? new Date(date) : null;
    items.push({ title, url, publishedAt: d && !isNaN(d.getTime()) ? d.toISOString() : undefined, summary: summary?.slice(0, 300) });
  }
  return items;
}

const decode = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

/** What a page says about itself: OpenGraph first, then <title>. */
export function parsePageMeta(html: string): { title?: string; site?: string; description?: string; publishedAt?: string } {
  const meta = (name: string): string | undefined => {
    const re = new RegExp(`<meta\\b[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i");
    const m = html.match(re) ?? html.match(re2);
    return m ? decode(m[1]).trim() : undefined;
  };
  const title = meta("og:title") ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const date = meta("article:published_time") ?? meta("date") ?? meta("dc.date");
  const d = date ? new Date(date) : null;
  return { title: title ? decode(title).replace(/\s+/g, " ") : undefined, site: meta("og:site_name"), description: meta("og:description") ?? meta("description"), publishedAt: d && !isNaN(d.getTime()) ? d.toISOString() : undefined };
}

export const newsId = (now = new Date()): string => `n-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7)}`;

/** Where a related-item chip sends the reader. */
export const linkHref = (l: NewsLink): string => (l.kind === "offer" ? `/offres/${l.key}` : l.kind === "company" ? `/societes/${l.key.toLowerCase()}` : l.kind === "issuer" ? `/emetteurs/${l.key}` : `/info#terme-${l.key}`);
