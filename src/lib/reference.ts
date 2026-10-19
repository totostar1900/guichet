import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
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
export const REF = { types: "product_type", bondTerms: "bond_term", companies: "company", issuers: "issuer", glossary: "glossary", policy: "policy", lessons: "lesson", bareme: "bareme", ecartes: "ecarte" } as const;

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

/**
 * LE RÉFÉRENTIEL SE GARDE ENTRE LES REQUÊTES, ET PAS SEULEMENT PENDANT UNE.
 *
 * Mesuré le 20 octobre 2026 : « loadRegistry » coûtait 669 ms, et c'était la
 * plus grosse lecture de TOUTES les pages des DEUX hôtes. Elle était mémoïsée
 * par requête, donc relue intégralement à chaque visiteur, alors que le
 * référentiel ne change que lorsqu'une personne du desk publie.
 *
 * CE QUI REND LA CHOSE SÛRE N'EST PAS LA DURÉE MAIS L'ÉTIQUETTE. Un cache à
 * minuterie servirait un barème périmé pendant sa minute, sans le dire. Ici
 * la seule chose qui le vide est une écriture du référentiel, et toutes les
 * écritures passent par le dépôt, qui les purge en UN endroit (voir
 * « data/memo.ts »). Un sixième chemin d'écriture sera donc couvert le jour
 * où il naîtra, sans que personne ait à y penser, et un essai refuse qu'une
 * méthode nouvelle échappe au classement.
 *
 * La minuterie d'un jour n'est qu'un filet : si une purge se perdait, le pire
 * durerait jusqu'au lendemain au lieu de toujours.
 */
export const ETIQUETTE_REFERENTIEL = "referentiel";

const lu = unstable_cache(async (kind: string) => direct(kind), ["referentiel"], {
  tags: [ETIQUETTE_REFERENTIEL],
  revalidate: 86_400,
});

/** La lecture nue, sans rien garder. */
const direct = async (kind: string) => (await repo().listReference(kind)).filter((r) => r.data != null);

/**
 * Deux étages : « unstable_cache » entre les requêtes, « cache » pendant
 * l'une d'elles. Le second évite de redemander quatre fois la même sorte au
 * premier cache pendant un même rendu.
 *
 * ET UN REPLI, QUI N EST PAS UNE PRÉCAUTION DE STYLE. Hors d une requête,
 * « unstable_cache » jette : « Invariant: incrementalCache missing ». Or le
 * référentiel se lit AUSSI depuis les crons, les scripts et le robot, qui ne
 * rendent aucune page. Sans ce repli, la note de marché du matin et le
 * ramassage de la BEAC seraient tombés, et l essai l a dit avant la
 * production. On lit alors sans garder : il n y a de toute façon aucun cache
 * de page à servir.
 */
const raw = cache(async (kind: string) => {
  try {
    return await lu(kind);
  } catch {
    return direct(kind);
  }
});

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
