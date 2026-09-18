import "server-only";
import { repo } from "@/lib/data";
import { loadCompanies, loadGlossary, loadIssuers } from "@/lib/reference";
import type { NewsLink } from "./model";

export interface LinkCandidate extends NewsLink {
  /** Every spelling that resolves to this target (id, ISIN, mnemo, short label…). */
  aliases: string[];
}

const fold = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Everything a news item can point at: open or past lines, listed companies, bond issuers, glossary terms. */
export async function linkCandidates(): Promise<LinkCandidate[]> {
  const [offers, companies, issuers, glossary] = await Promise.all([repo().listOffers(), loadCompanies(), loadIssuers(), loadGlossary()]);
  const out: LinkCandidate[] = [];
  for (const o of offers) if (!o.hidden) out.push({ kind: "offer", key: o.id, label: o.title, aliases: [o.id, o.isin, o.title] });
  for (const c of companies) out.push({ kind: "company", key: c.mnemo, label: c.shortName, aliases: [c.mnemo, c.isin, c.shortName, c.name] });
  for (const i of issuers) out.push({ kind: "issuer", key: i.slug, label: i.shortName, aliases: [i.slug, i.mnemo, i.shortName, i.name] });
  for (const [k, t] of Object.entries(glossary)) out.push({ kind: "term", key: k, label: t.short, aliases: [k, t.short, `info · ${t.short}`, `terme · ${t.short}`] });
  return out;
}

/** « SEMC, dividende, rca-ota-c-2028 » → resolved links, or the token nobody recognises. */
export async function resolveLinks(text: string): Promise<{ links: NewsLink[]; unknown: string[] }> {
  const tokens = text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  const cands = await linkCandidates();
  const links: NewsLink[] = [];
  const unknown: string[] = [];
  for (const tok of tokens) {
    const f = fold(tok);
    const hit = cands.find((c) => c.aliases.some((a) => fold(a) === f)) ?? cands.find((c) => c.aliases.some((a) => fold(a).includes(f) && f.length >= 4));
    if (!hit) unknown.push(tok);
    else if (!links.some((l) => l.kind === hit.kind && l.key === hit.key)) links.push({ kind: hit.kind, key: hit.key, label: hit.label });
  }
  return { links, unknown };
}
