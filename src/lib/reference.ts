import "server-only";
import { cache } from "react";
import { repo } from "@/lib/data";
import { BOND_TERMS, type BondTerms } from "@/data/bond-terms";
import { COMPANIES, type Company } from "@/data/companies";
import { ISSUERS, type BondIssuer } from "@/data/issuers";
import { GLOSSARY as GLOSSARY_DEFAULTS, type Term } from "@/lib/glossary";
import { LESSONS, type Lesson } from "@/data/lessons";
import { BUILTIN_TYPES, type ProductType, type Registry, setRegistry } from "@/lib/registry";
import { buildIssuerRegistry, setIssuerRegistry, type IssuerProfile } from "@/data/issuer-registry";

/**
 * Reference data as the desk maintains it in the app. Each kind starts from
 * the built-in defaults shipped in code and is overridden row by row from the
 * `reference` table : so an empty table changes nothing. The desk's changes
 * wait as drafts on the row until « Publier » ; only `data` is read here.
 */
export const REF = { types: "product_type", bondTerms: "bond_term", companies: "company", issuers: "issuer", glossary: "glossary", policy: "policy", lessons: "lesson" } as const;

/**
 * Supprimer une entrée que le code livre.
 *
 * Une entrée du desk se supprime en effaçant sa ligne : il ne reste rien. Une
 * entrée livrée avec l'application ne peut pas s'effacer de cette façon, car
 * le code la remettrait au chargement suivant. Elle se couvre donc d'une
 * pierre : une ligne du référentiel qui ne porte pas une valeur mais son
 * absence, et que les listes retirent.
 *
 * C'est réversible, et c'est le point : « Revenir aux valeurs par défaut »
 * efface la pierre, et le terme revient tel que le code l'écrit. Une
 * suppression qui ne se défait pas n'a pas sa place dans un référentiel que
 * plusieurs mains tiennent.
 */
export const TOMBSTONE = { __supprime: true } as const;
export const isTombstone = (d: unknown): boolean => typeof d === "object" && d !== null && (d as { __supprime?: unknown }).__supprime === true;

const raw = cache(async (kind: string) => (await repo().listReference(kind)).filter((r) => r.data != null));

const rows = cache(async <T,>(kind: string): Promise<Map<string, T>> => new Map((await raw(kind)).filter((r) => !isTombstone(r.data)).map((r) => [r.key, r.data as T])));

/** Les clefs que le desk a supprimées : elles ne paraissent nulle part, même livrées par le code. */
export const gone = cache(async (kind: string): Promise<Set<string>> => new Set((await raw(kind)).filter((r) => isTombstone(r.data)).map((r) => r.key)));

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
  for (const key of await gone(REF.glossary)) delete out[key];
  for (const [key, t] of await rows<Term>(REF.glossary)) out[key] = t;
  return out;
});

export const loadLessons = cache(async (): Promise<Lesson[]> => {
  const [db, removed] = await Promise.all([rows<Lesson>(REF.lessons), gone(REF.lessons)]);
  const merged = LESSONS.filter((l) => !removed.has(l.key)).map((l) => db.get(l.key) ?? l);
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

/**
 * Le registre des émetteurs tel que les fiches publiées le font, installé au
 * passage pour que `resolveIssuer` dise la même chose partout sur le serveur.
 * Une société renommée au desk change donc aussi la tête de groupe du
 * navigateur de lignes et le volet « Émetteur » d'une fiche, pas seulement la
 * page /societes.
 */
export const loadIssuerRegistry = cache(async (): Promise<IssuerProfile[]> => {
  const [companies, issuers] = await Promise.all([loadCompanies(), loadIssuers()]);
  const list = buildIssuerRegistry(companies, issuers);
  setIssuerRegistry(list);
  return list;
});
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
