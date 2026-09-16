"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { importDefaults, REF } from "@/lib/reference";
import { BUILTIN_TYPES, type ProductType } from "@/lib/registry";

export type RefResult = { ok: true; message: string } | { ok: false; error: string };

const KINDS = Object.values(REF) as string[];
const KIND_LABEL: Record<string, string> = { product_type: "type de produit", bond_term: "échéancier", company: "société", issuer: "émetteur", glossary: "terme" };

function revalidateAll() {
  for (const p of ["/", "/desk", "/desk/referentiel", "/societes", "/fonds", "/simulateur", "/comparer"]) revalidatePath(p);
  revalidatePath("/offres/[id]", "page");
  revalidatePath("/societes/[mnemo]", "page");
  revalidatePath("/emetteurs/[slug]", "page");
}

async function log(html: string, by: string) {
  await repo().logEvent({ kind: "desk", html: `${html} · par ${by}` });
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
  await repo().upsertReference(REF.types, t.key, t, desk.name);
  await audit("reference.upsert", "reference", `${REF.types}/${t.key}`, { before: beforeT, after: t });
  await log(`Type de produit <b>${t.key}</b> ${builtin ? "modifié" : "enregistré"} (${t.label})`, desk.name);
  revalidateAll();
  return { ok: true, message: `Type ${t.key} enregistré.` };
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
  await repo().upsertReference(REF.bondTerms, isin, data, desk.name);
  await audit("reference.upsert", "reference", `${REF.bondTerms}/${isin}`, { before: beforeB, after: data });
  await log(`Échéancier <b>${isin}</b> enregistré (échéance ${maturityOn}, ${periodsPerYear}/an)`, desk.name);
  revalidateAll();
  return { ok: true, message: `Échéancier ${isin} enregistré.` };
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
  await repo().upsertReference(REF.glossary, key, { short, ...(long ? { long } : {}), text }, desk.name);
  await audit("reference.upsert", "reference", `${REF.glossary}/${key}`, { before: beforeG, after: { short, long, text } });
  await log(`Terme du glossaire <b>${short}</b> enregistré`, desk.name);
  revalidateAll();
  return { ok: true, message: `Terme « ${short} » enregistré.` };
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
    return { ok: false, error: `Fiche incomplète : ${i?.path.join(".") || "racine"} — ${i?.message}.` };
  }
  const key = kind === REF.companies ? (p.data as { mnemo: string }).mnemo : (p.data as { slug: string }).slug;
  const beforeJ = (await repo().listReference(kind)).find((r) => r.key === key)?.data;
  await repo().upsertReference(kind, key, p.data, desk.name);
  await audit("reference.upsert", "reference", `${kind}/${key}`, { before: beforeJ, after: p.data });
  await log(`Fiche ${KIND_LABEL[kind]} <b>${key}</b> enregistrée`, desk.name);
  revalidateAll();
  return { ok: true, message: `Fiche ${key} enregistrée.` };
}

/* ---------- Commun : retour aux valeurs par défaut, suppression, import ---------- */

/** Removes the desk's row: a built-in entry goes back to the code defaults, a desk-created one disappears. */
export async function resetReferenceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/referentiel");
  const kind = String(form.get("kind") ?? "");
  const key = String(form.get("key") ?? "");
  if (!KINDS.includes(kind) || !key) return;
  const beforeD = (await repo().listReference(kind)).find((r) => r.key === key)?.data;
  await repo().deleteReference(kind, key);
  await audit("reference.delete", "reference", `${kind}/${key}`, { before: beforeD });
  await log(`${KIND_LABEL[kind] ?? kind} <b>${key}</b> : retour aux valeurs par défaut (ou suppression)`, desk.name);
  revalidateAll();
}

export async function importDefaultsAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/referentiel");
  const kind = String(form.get("kind") ?? "");
  if (!KINDS.includes(kind)) return;
  const n = await importDefaults(kind, desk.name);
  await log(`Valeurs par défaut importées : ${n} ${KIND_LABEL[kind] ?? kind}(s)`, desk.name);
  revalidateAll();
}
