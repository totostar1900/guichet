"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { REF, TOMBSTONE, isTombstone } from "@/lib/reference";
import { GLOSSARY } from "@/lib/glossary";
import { LESSONS } from "@/data/lessons";
import { COMPANIES } from "@/data/companies";
import { ISSUERS } from "@/data/issuers";
import { BUILTIN_TYPES, type ProductType } from "@/lib/registry";

export type RefResult = { ok: true; message: string } | { ok: false; error: string };

const KINDS = Object.values(REF) as string[];
const KIND_LABEL: Record<string, string> = { product_type: "type de produit", bond_term: "échéancier", company: "société", issuer: "émetteur", glossary: "terme", lesson: "leçon", policy: "règle" };

function revalidateAll() {
  for (const p of ["/", "/desk", "/desk/referentiel", "/societes", "/fonds", "/comparer", "/info"]) revalidatePath(p);
  revalidatePath("/info/[key]", "page");
  revalidatePath("/offres/[id]", "page");
  revalidatePath("/societes/[mnemo]", "page");
  revalidatePath("/emetteurs/[slug]", "page");
}

async function log(html: string, by: string) {
  await repo().logEvent({ kind: "desk", html: `${html} · par ${by}` });
}

/** The tab of the page that shows one kind. */
const TAB_OF: Record<string, string> = { [REF.types]: "types", [REF.bondTerms]: "echeanciers", [REF.glossary]: "glossaire", [REF.lessons]: "lecons", [REF.companies]: "societes", [REF.issuers]: "emetteurs" };

/** After a staged change: back to the list, the row highlighted, the form closed. */
function done(kind: string, key: string): never {
  revalidatePath("/desk/referentiel");
  redirect(`/desk/referentiel?onglet=${TAB_OF[kind] ?? "types"}&ok=${encodeURIComponent(key)}`);
}

/* ---------- Types de produits ---------- */

const lines = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const HEX = /^#[0-9a-f]{6}$/i;

const typeSchema = z.object({
  key: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{2,24}$/, "Clé : lettres, chiffres et _ (2 à 24 caractères)."),
  label: z.string().trim().min(2, "Libellé requis."),
  short: z.string().trim().min(1, "Badge requis.").max(14, "Badge : 14 caractères maximum."),
  segment: z.enum(["primaire", "secondaire", "fonds"]),
  engine: z.enum(["bullet_bond", "amort_bond", "discount_bill", "equity", "fund_unit", "buyback", "info"]),
  color: z.string().regex(HEX, "Couleur : #rrggbb."),
  colorSoft: z.string().regex(HEX, "Couleur de fond : #rrggbb."),
  cautions: z.string().default(""),
  checklist: z.string().default(""),
  fields: z.string().default(""),
  sort: z.coerce.number().int().min(0).max(999).default(500),
  enabled: z.string().optional(),
});

const INTENTS = ["appetit", "ferme", "info", "rappel", "cession", "achat", "vente", "souscription", "rachat"] as const;

/** Creates or updates a product type; a built-in type is overridden row by row, never lost. */
export async function saveTypeAction(_p: RefResult | null, form: FormData): Promise<RefResult> {
  const desk = await requireDesk("/desk/referentiel");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string") raw[k] = v;
  });
  const p = typeSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const d = p.data;
  const intentsOpen = form.getAll("intent").map(String).filter((x): x is (typeof INTENTS)[number] => (INTENTS as readonly string[]).includes(x));
  const cautions: [string, string][] = [];
  for (const l of lines(d.cautions)) {
    const i = l.indexOf("|");
    if (i < 0) return { ok: false, error: `Point d'attention sans séparateur « | » : « ${l.slice(0, 40)} »` };
    cautions.push([l.slice(0, i).trim(), l.slice(i + 1).trim()]);
  }
  const fields: ProductType["fields"] = [];
  for (const l of lines(d.fields)) {
    const [key, label, req] = l.split("|").map((x) => x.trim());
    if (!key || !label || !/^[a-z0-9_]+$/.test(key)) return { ok: false, error: `Champ libre invalide : « ${l.slice(0, 40)} » (attendu : cle|Libellé|oui/non).` };
    fields.push({ key, label, required: /^(oui|o|yes|true|1)$/i.test(req ?? "") });
  }
  const builtin = BUILTIN_TYPES.some((t) => t.key === d.key);
  const t: ProductType = { key: d.key, label: d.label, short: d.short, segment: d.segment, engine: d.engine, color: d.color.toLowerCase(), colorSoft: d.colorSoft.toLowerCase(), cautions, checklist: lines(d.checklist), intentsOpen, fields, enabled: d.enabled === "on", sort: d.sort, builtin };
  const beforeT = (await repo().listReference(REF.types)).find((r) => r.key === t.key)?.data;
  await repo().saveReferenceDraft(REF.types, t.key, { op: "set", data: t }, desk.name);
  await audit("reference.draft", "reference", `${REF.types}/${t.key}`, { before: beforeT, after: t });
  await log(`Type de produit <b>${t.key}</b> ${builtin ? "modifié" : "créé"} en brouillon (${t.label})`, desk.name);
  done(REF.types, t.key);
}

/* ---------- Échéanciers ---------- */

const termSchema = z.object({
  isin: z.string().trim().toUpperCase().regex(/^[A-Z]{2}[A-Z0-9]{10}$/, "ISIN : 12 caractères."),
  maturityOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Échéance : date exacte requise."),
  periodsPerYear: z.coerce.number().refine((n) => n === 1 || n === 2 || n === 4, "Périodicité : 1, 2 ou 4."),
  graceUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  source: z.string().trim().min(3, "Source requise (fiche signalétique, note d'information…)."),
});

export async function saveTermAction(_p: RefResult | null, form: FormData): Promise<RefResult> {
  const desk = await requireDesk("/desk/referentiel");
  const p = termSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const { isin, maturityOn, periodsPerYear, graceUntil, source } = p.data;
  const data = { isin, maturityOn, periodsPerYear: periodsPerYear as 1 | 2 | 4, ...(graceUntil ? { graceUntil } : {}), source };
  const beforeB = (await repo().listReference(REF.bondTerms)).find((r) => r.key === isin)?.data;
  await repo().saveReferenceDraft(REF.bondTerms, isin, { op: "set", data: data }, desk.name);
  await audit("reference.draft", "reference", `${REF.bondTerms}/${isin}`, { before: beforeB, after: data });
  await log(`Échéancier <b>${isin}</b> en brouillon (échéance ${maturityOn}, ${periodsPerYear}/an)`, desk.name);
  done(REF.bondTerms, isin);
}

/* ---------- Glossaire ---------- */

const termGlossSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{2,40}$/, "Clé : minuscules, chiffres et _ ."),
  short: z.string().trim().min(1, "Terme requis."),
  long: z.string().trim().optional(),
  text: z.string().trim().min(10, "Explication requise (une ou deux phrases)."),
});

export async function saveGlossaryAction(_p: RefResult | null, form: FormData): Promise<RefResult> {
  const desk = await requireDesk("/desk/referentiel");
  const p = termGlossSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const { key, short, long, text } = p.data;
  const beforeG = (await repo().listReference(REF.glossary)).find((r) => r.key === key)?.data;
  await repo().saveReferenceDraft(REF.glossary, key, { op: "set", data: { short, ...(long ? { long } : {}), text } }, desk.name);
  await audit("reference.draft", "reference", `${REF.glossary}/${key}`, { before: beforeG, after: { short, long, text } });
  await log(`Terme du glossaire <b>${short}</b> en brouillon`, desk.name);
  done(REF.glossary, key);
}

/* ---------- Leçons (Info) ---------- */

const lessonSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/, "Clé : minuscules, chiffres et tirets."),
  order: z.coerce.number().int().min(1).max(99),
  minutes: z.coerce.number().int().min(1).max(30).default(2),
  title: z.string().trim().min(4, "Titre requis."),
  intro: z.string().trim().min(10, "Une phrase d'introduction est requise."),
  body: z.string().trim().min(20, "Le corps de la leçon est requis (paragraphes séparés par une ligne vide)."),
  widget: z.enum(["bond_price", "bta_rate", "tenor", "equity", "fund", "auction", "risks", "read_ota", "carte", "chemin", "vie", "categories", "indice"]),
  section: z.enum(["", "acteurs", "instruments", "risques", "ordre", "cadre"]).default(""),
  q: z.string().trim().min(5, "La question est requise."),
  o1: z.string().trim().min(1, "Trois réponses sont requises."),
  o2: z.string().trim().min(1, "Trois réponses sont requises."),
  o3: z.string().trim().min(1, "Trois réponses sont requises."),
  answer: z.coerce.number().int().min(0).max(2),
  why: z.string().trim().min(5, "Expliquez la bonne réponse en une phrase."),
  terms: z.string().default(""),
});

export async function saveLessonAction(_p: RefResult | null, form: FormData): Promise<RefResult> {
  const desk = await requireDesk("/desk/referentiel");
  const p = lessonSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const d = p.data;
  if (form.get("nouvelle") === "1") {
    // a copy (or a new lesson) must not silently overwrite an existing key
    const taken = LESSONS.some((l) => l.key === d.key) || (await repo().listReference(REF.lessons)).some((r) => r.key === d.key);
    if (taken) return { ok: false, error: `La clé « ${d.key} » existe déjà : choisissez-en une autre pour cette nouvelle leçon.` };
  }
  const data = {
    key: d.key,
    order: d.order,
    minutes: d.minutes,
    title: d.title,
    intro: d.intro,
    body: d.body.split(/\n\s*\n/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean),
    widget: d.widget,
    ...(d.section ? { section: d.section } : {}),
    quiz: { q: d.q, options: [d.o1, d.o2, d.o3], answer: d.answer, why: d.why },
    terms: d.terms.split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean),
  };
  const before = (await repo().listReference(REF.lessons)).find((r) => r.key === d.key)?.data;
  await repo().saveReferenceDraft(REF.lessons, d.key, { op: "set", data: data }, desk.name);
  await audit("reference.draft", "reference", `${REF.lessons}/${d.key}`, { before, after: data });
  await log(`Leçon <b>${d.title}</b> en brouillon`, desk.name);
  done(REF.lessons, d.key);
}

/* ---------- Sociétés et émetteurs (fiches complètes, éditées en JSON) ---------- */

const yearFig = z.object({ year: z.number().int() }).passthrough();
const COUNTRY = z.enum(["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."]);
const companySchema = z
  .object({
    mnemo: z.string().min(2),
    isin: z.string().min(12),
    name: z.string().min(2),
    shortName: z.string().min(1),
    sector: z.string(),
    activity: z.string(),
    country: COUNTRY,
    city: z.string(),
    listedOn: z.string(),
    shareCapital: z.number(),
    sharesTotal: z.number(),
    sharesFloat: z.number(),
    freeFloatPct: z.number(),
    coreShareholders: z.array(z.object({ name: z.string(), pct: z.number() })),
    figures: z.array(yearFig).min(1),
    documents: z.array(z.object({ title: z.string(), url: z.string() }).passthrough()),
    reading: z.array(z.string()),
  })
  .passthrough();
const issuerSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(2),
    shortName: z.string().min(1),
    mnemo: z.string(),
    sector: z.string(),
    activity: z.string(),
    country: COUNTRY,
    city: z.string(),
    shareCapital: z.number(),
    shareholders: z.array(z.object({ name: z.string(), pct: z.number() })),
    isins: z.array(z.string()),
    unit: z.union([z.literal(1), z.literal(1000), z.literal(1000000)]),
    unitNote: z.string(),
    figures: z.array(yearFig).min(1),
    documents: z.array(z.object({ title: z.string(), year: z.number(), url: z.string() })),
    reading: z.array(z.string()),
  })
  .passthrough();

export async function saveJsonAction(_p: RefResult | null, form: FormData): Promise<RefResult> {
  const desk = await requireDesk("/desk/referentiel");
  const kind = String(form.get("kind") ?? "");
  if (kind !== REF.companies && kind !== REF.issuers) return { ok: false, error: "Type de fiche inconnu." };
  let json: unknown;
  try {
    json = JSON.parse(String(form.get("json") ?? ""));
  } catch {
    return { ok: false, error: "JSON invalide : vérifiez les virgules et les guillemets." };
  }
  const p = (kind === REF.companies ? companySchema : issuerSchema).safeParse(json);
  if (!p.success) {
    const i = p.error.issues[0];
    return { ok: false, error: `Fiche incomplète : ${i?.path.join(".") || "racine"} : ${i?.message}.` };
  }
  const key = kind === REF.companies ? (p.data as { mnemo: string }).mnemo : (p.data as { slug: string }).slug;
  if (form.get("nouvelle") === "1") {
    const taken = (kind === REF.companies ? COMPANIES.some((c) => c.mnemo === key) : ISSUERS.some((i) => i.slug === key)) || (await repo().listReference(kind)).some((r) => r.key === key);
    if (taken) return { ok: false, error: `L'identifiant « ${key} » existe déjà : choisissez-en un autre pour cette nouvelle fiche.` };
  }
  const beforeJ = (await repo().listReference(kind)).find((r) => r.key === key)?.data;
  await repo().saveReferenceDraft(kind, key, { op: "set", data: p.data }, desk.name);
  await audit("reference.draft", "reference", `${kind}/${key}`, { before: beforeJ, after: p.data });
  await log(`Fiche ${KIND_LABEL[kind]} <b>${key}</b> en brouillon`, desk.name);
  done(kind, key);
}

/* ---------- Commun : retour aux valeurs par défaut, publication, abandon ---------- */

/** Stages the return to the code default (a desk-created entry disappears at publication). */
/** Les clefs que le code livre, par nature d'entrée : celles-là ne s'effacent pas, elles se couvrent. */
const builtinKeys: Record<string, () => string[]> = {
  [REF.types]: () => BUILTIN_TYPES.map((t) => t.key),
  [REF.glossary]: () => Object.keys(GLOSSARY),
  [REF.lessons]: () => LESSONS.map((l) => l.key),
  [REF.companies]: () => COMPANIES.map((c) => c.mnemo),
  [REF.issuers]: () => ISSUERS.map((i) => i.slug),
};

/**
 * Supprimer une entrée du référentiel, en brouillon comme tout le reste.
 *
 * Deux chemins pour un même geste, et l'opérateur n'a pas à savoir lequel il
 * emprunte : une entrée que le desk a créée s'efface, une entrée que le code
 * livre se couvre d'une pierre, parce que l'effacer la ferait revenir au
 * chargement suivant. Les deux se défont par « Revenir aux valeurs par
 * défaut », et aucun des deux ne bouge avant « Publier ».
 */
export async function removeReferenceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/referentiel");
  const kind = String(form.get("kind") ?? "");
  const key = String(form.get("key") ?? "");
  if (!KINDS.includes(kind) || !key) return;
  const row = (await repo().listReference(kind)).find((r) => r.key === key);
  const builtin = (builtinKeys[kind]?.() ?? []).includes(key);
  if (!builtin && row?.data == null) {
    // rien de publié : le brouillon s'en va, et il ne reste rien
    await repo().discardReference(kind, [key]);
  } else if (builtin) {
    await repo().saveReferenceDraft(kind, key, { op: "set", data: TOMBSTONE }, desk.name);
    await audit("reference.draft", "reference", `${kind}/${key}`, { before: row?.data ?? null, after: TOMBSTONE, reason: "suppression" });
  } else {
    await repo().saveReferenceDraft(kind, key, { op: "reset" }, desk.name);
    await audit("reference.draft", "reference", `${kind}/${key}`, { before: row?.data ?? null, after: null, reason: "suppression" });
  }
  await log(`${KIND_LABEL[kind] ?? kind} <b>${key}</b> : suppression en brouillon`, desk.name);
  done(kind, key);
}

/** Lève la pierre : l'entrée livrée par le code revient telle qu'il l'écrit. */
export async function restoreReferenceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/referentiel");
  const kind = String(form.get("kind") ?? "");
  const key = String(form.get("key") ?? "");
  if (!KINDS.includes(kind) || !key) return;
  const row = (await repo().listReference(kind)).find((r) => r.key === key);
  if (!row || !isTombstone(row.data)) return;
  await repo().saveReferenceDraft(kind, key, { op: "reset" }, desk.name);
  await audit("reference.draft", "reference", `${kind}/${key}`, { before: row.data, after: null, reason: "rétablissement" });
  await log(`${KIND_LABEL[kind] ?? kind} <b>${key}</b> : rétablissement en brouillon`, desk.name);
  done(kind, key);
}

export async function resetReferenceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/referentiel");
  const kind = String(form.get("kind") ?? "");
  const key = String(form.get("key") ?? "");
  if (!KINDS.includes(kind) || !key) return;
  const row = (await repo().listReference(kind)).find((r) => r.key === key);
  if (!row) return;
  if (row.data == null) {
    // a new entry still in draft: nothing to publish back to, the draft simply goes
    await repo().discardReference(kind, [key]);
  } else {
    await repo().saveReferenceDraft(kind, key, { op: "reset" }, desk.name);
    await audit("reference.draft", "reference", `${kind}/${key}`, { before: row.data, after: null });
  }
  await log(`${KIND_LABEL[kind] ?? kind} <b>${key}</b> : retour aux valeurs par défaut en brouillon`, desk.name);
  done(kind, key);
}

/** Makes every draft of one tab (or one entry) what the app reads. */
export async function publishReferenceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/referentiel");
  const kind = String(form.get("kind") ?? "");
  const key = String(form.get("key") ?? "");
  if (!KINDS.includes(kind)) return;
  const rows = (await repo().listReference(kind)).filter((r) => r.draft && (!key || r.key === key));
  const keys = await repo().publishReference(kind, key ? [key] : undefined);
  for (const r of rows) await audit("reference.publish", "reference", `${kind}/${r.key}`, { before: r.data, after: r.draft?.op === "set" ? r.draft.data : null });
  await log(`${KIND_LABEL[kind] ?? kind} : ${keys.length} modification(s) publiée(s)${keys.length <= 6 ? ` (${keys.join(", ")})` : ""}`, desk.name);
  revalidateAll();
  redirect(`/desk/referentiel?onglet=${TAB_OF[kind] ?? "types"}&publie=${keys.length}`);
}

/** Drops every draft of one tab (or one entry); what the app reads does not move. */
export async function discardReferenceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/referentiel");
  const kind = String(form.get("kind") ?? "");
  const key = String(form.get("key") ?? "");
  if (!KINDS.includes(kind)) return;
  const keys = await repo().discardReference(kind, key ? [key] : undefined);
  await log(`${KIND_LABEL[kind] ?? kind} : ${keys.length} brouillon(s) abandonné(s)`, desk.name);
  revalidatePath("/desk/referentiel");
  redirect(`/desk/referentiel?onglet=${TAB_OF[kind] ?? "types"}`);
}
