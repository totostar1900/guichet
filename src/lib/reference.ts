import "server-only";
import { cache } from "react";
import { repo } from "@/lib/data";
import { BOND_TERMS, type BondTerms } from "@/data/bond-terms";
import { COMPANIES, type Company } from "@/data/companies";
import { ISSUERS, type BondIssuer } from "@/data/issuers";
import { GLOSSARY as GLOSSARY_DEFAULTS, type Term } from "@/lib/glossary";
import { LESSONS, type Lesson } from "@/data/lessons";
import { BUILTIN_TYPES, type ProductType, type Registry, setRegistry } from "@/lib/registry";

/**
 * Reference data as the desk maintains it in the app. Each kind starts from
 * the built-in defaults shipped in code and is overridden row by row from the
 * `reference` table — so an empty table changes nothing, and « Importer les
 * valeurs par défaut » on the desk copies the defaults into the table to edit.
 */
export const REF = { types: "product_type", bondTerms: "bond_term", companies: "company", issuers: "issuer", glossary: "glossary", policy: "policy", lessons: "lesson" } as const;

const rows = cache(async <T,>(kind: string): Promise<Map<string, T>> => {
  const list = await repo().listReference(kind);
  return new Map(list.map((r) => [r.key, r.data as T]));
});

export const loadTypes = cache(async (): Promise<ProductType[]> => {
  const db = await rows<ProductType>(REF.types);
  const merged = BUILTIN_TYPES.map((t) => ({ ...t, ...(db.get(t.key) ?? {}), builtin: true }));
  for (const [key, t] of db) if (!merged.some((m) => m.key === key)) merged.push({ ...t, key, builtin: false });
  return merged.sort((a, b) => a.sort - b.sort);
});

export const loadBondTerms = cache(async (): Promise<Map<string, BondTerms>> => {
  const out = new Map(BOND_TERMS.map((b) => [b.isin, b]));
  for (const [isin, t] of await rows<BondTerms>(REF.bondTerms)) out.set(isin, { ...t, isin });
  return out;
});

export const loadGlossary = cache(async (): Promise<Record<string, Term>> => {
  const out: Record<string, Term> = { ...GLOSSARY_DEFAULTS };
  for (const [key, t] of await rows<Term>(REF.glossary)) out[key] = t;
  return out;
});

export const loadLessons = cache(async (): Promise<Lesson[]> => {
  const db = await rows<Lesson>(REF.lessons);
  const merged = LESSONS.map((l) => db.get(l.key) ?? l);
  for (const [key, l] of db) if (!merged.some((m) => m.key === key)) merged.push({ ...l, key });
  return merged.sort((a, b) => a.order - b.order);
});

export const loadCompanies = cache(async (): Promise<Company[]> => {
  const db = await rows<Company>(REF.companies);
  const merged = COMPANIES.map((c) => db.get(c.mnemo) ?? c);
  for (const [key, c] of db) if (!merged.some((m) => m.mnemo === key)) merged.push({ ...c, mnemo: key });
  return merged;
});
export const companyByMnemo = async (mnemo: string) => (await loadCompanies()).find((c) => c.mnemo.toLowerCase() === mnemo.toLowerCase());
export const companyByIsin = async (isin: string) => (await loadCompanies()).find((c) => c.isin === isin);

export const loadIssuers = cache(async (): Promise<BondIssuer[]> => {
  const db = await rows<BondIssuer>(REF.issuers);
  const merged = ISSUERS.map((i) => db.get(i.slug) ?? i);
  for (const [key, i] of db) if (!merged.some((m) => m.slug === key)) merged.push({ ...i, slug: key });
  return merged;
});
export const issuerBySlug = async (slug: string) => (await loadIssuers()).find((i) => i.slug === slug.toLowerCase());
export const issuerByIsin = async (isin: string) => (await loadIssuers()).find((i) => i.isins.includes(isin));

/** Everything the domain layer reads synchronously, loaded once per request and installed. */
export const loadRegistry = cache(async (): Promise<Registry> => {
  const [types, bondTerms, glossary, lessons] = await Promise.all([loadTypes(), loadBondTerms(), loadGlossary(), loadLessons()]);
  const reg = { types, bondTerms, glossary, lessons };
  setRegistry(reg);
  return reg;
});

/** Copies the code defaults of one kind into the table (only keys not yet there), so the desk can edit them. */
export async function importDefaults(kind: string, by: string): Promise<number> {
  const r = repo();
  const have = new Set((await r.listReference(kind)).map((x) => x.key));
  const entries: [string, unknown][] =
    kind === REF.types
      ? BUILTIN_TYPES.map((t) => [t.key, t])
      : kind === REF.bondTerms
        ? BOND_TERMS.map((b) => [b.isin, b])
        : kind === REF.companies
          ? COMPANIES.map((c) => [c.mnemo, c])
          : kind === REF.issuers
            ? ISSUERS.map((i) => [i.slug, i])
            : kind === REF.glossary
              ? Object.entries(GLOSSARY_DEFAULTS)
              : kind === REF.lessons
                ? LESSONS.map((l) => [l.key, l])
                : [];
  let n = 0;
  for (const [key, data] of entries) {
    if (have.has(key)) continue;
    await r.upsertReference(kind, key, data, by);
    n++;
  }
  return n;
}
