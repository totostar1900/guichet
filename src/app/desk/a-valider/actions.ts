"use server";

import { loadRegistry } from "@/lib/reference";
import { approvalReason, loadPolicy } from "@/lib/policy";
import { ConflictError } from "@/lib/domain/types";
import { isResponsable } from "@/lib/auth/types";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { kindForEngine, typeByKey } from "@/lib/registry";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { Confidence, OfferDraft } from "@/lib/domain/types";
import { fmtPct } from "@/lib/format";
import { buildOffer } from "@/lib/intake/publish";
import { ingestSource } from "@/lib/intake/ingest";
import { notifyOfferPublished } from "@/lib/notify/dispatch";

export type IntakeResult = { ok: true; pending?: string } | { ok: false; error: string };

/* ---------- Nouvelle source : fichier ou texte collé ---------- */

export async function createIntakeAction(_prev: IntakeResult | null, form: FormData): Promise<IntakeResult> {
  const desk = await requireDesk("/desk/a-valider");
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const res = await ingestSource({
    title: String(form.get("title") ?? ""),
    fromLabel: String(form.get("from") ?? "").trim() || `Déposé par ${desk.name}`,
    hint: String(form.get("hint") ?? "").trim() || undefined,
    text: String(form.get("text") ?? ""),
    file: hasFile ? { bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type, name: file.name } : undefined,
  });
  if (!res.ok) return res;
  await audit("intake.create", "intake", res.item.id, { after: { title: res.item.title, source: res.item.source, from: res.item.fromLabel } });
  revalidatePath("/desk/a-valider");
  redirect(`/desk/a-valider?item=${res.item.id}`);
}

/* ---------- Enregistrer les corrections du desk ---------- */

const draftSchema = z.object({
  kind: z.enum(["OTA", "BTA", "ACTIONS", "APE", "RACHAT"]).optional(),
  operation: z.enum(["nouvelle_ligne", "abondement", "rachat", "ipo", "emprunt_ape"]).optional(),
  country: z.enum(["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."]).optional(),
  countryName: z.string().optional(),
  issuer: z.string().optional(),
  title: z.string().optional(),
  isin: z.string().optional(),
  sourceRef: z.string().optional(),
  nominal: z.coerce.number().optional(),
  couponRate: z.coerce.number().optional(),
  maturityOn: z.string().optional(),
  lastCouponOn: z.string().optional(),
  opensAt: z.string().optional(),
  deadlineAt: z.string().optional(),
  resultsAt: z.string().optional(),
  settleOn: z.string().optional(),
  sizeLabel: z.string().optional(),
  blurb: z.string().optional(),
  pricePerShare: z.coerce.number().optional(),
  minShares: z.coerce.number().optional(),
  sharesOffered: z.coerce.number().optional(),
  dividendPerShare: z.coerce.number().optional(),
  official: z.string().optional(),
  typeKey: z.string().optional(),
});

function draftFromForm(form: FormData, prev: OfferDraft): OfferDraft {
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim() !== "") raw[k] = v.trim();
  });
  const p = draftSchema.parse(raw);
  // The product type decides the storage kind; its free fields arrive as extra.<key>.
  const type = p.typeKey ? typeByKey(p.typeKey) : undefined;
  if (type) p.kind = kindForEngine(type.engine, type.segment).kind as typeof p.kind;
  const extra: Record<string, string> = { ...prev.extra };
  for (const f of type?.fields ?? []) {
    const v = raw[`extra.${f.key}`];
    if (v) extra[f.key] = v;
    else delete extra[f.key];
  }
  const next: OfferDraft = { ...prev, ...p, extra, official: p.official === "on" || (p.official === undefined && prev.official), lastCouponOn: p.lastCouponOn ?? null };
  // A field the desk edited is no longer "à vérifier".
  const conf: OfferDraft["confidence"] = { ...prev.confidence };
  (Object.keys(p) as (keyof typeof p)[]).forEach((k) => {
    if (k !== "official" && prev[k as keyof OfferDraft] !== next[k as keyof OfferDraft]) (conf as Record<string, Confidence>)[k] = "sure";
  });
  next.confidence = conf;
  return next;
}

export async function saveDraftAction(_prev: IntakeResult | null, form: FormData): Promise<IntakeResult> {
  await loadRegistry();
  await requireDesk("/desk/a-valider");
  const id = String(form.get("itemId") ?? "");
  const item = await repo().getIntake(id);
  if (!item) return { ok: false, error: "Source introuvable." };
  try {
    const draft = draftFromForm(form, item.draft);
    await repo().updateIntake(id, { draft, state: draft.official ? (item.state === "bloque" || item.state === "rejete" ? "a_valider" : item.state) : "bloque" });
    revalidatePath("/desk/a-valider");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Saisie invalide." };
  }
}

/* ---------- Publier ---------- */

const decisionSchema = z.object({
  itemId: z.string().min(1),
  pricePct: z.coerce.number().min(50).max(120).optional(),
  precountRate: z.coerce.number().min(0).max(30).optional(),
  commissionPct: z.coerce.number().min(0).max(5).default(0),
  minTitles: z.coerce.number().int().min(1).optional(),
  /** Un fonds : la première souscription se dit en francs. */
  minAmount: z.coerce.number().int().min(0).optional(),
  segment: z.string().default("Tous les clients"),
});

export async function publishAction(_prev: IntakeResult | null, form: FormData): Promise<IntakeResult> {
  await loadRegistry();
  const desk = await requireDesk("/desk/a-valider");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim() !== "") raw[k] = v.trim();
  });
  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Décision incomplète : prix (ou taux) et ticket minimum." };
  const { itemId, ...decision } = parsed.data;
  const channels = form.getAll("channel").map(String);

  const r = repo();
  const item = await r.getIntake(itemId);
  if (!item) return { ok: false, error: "Source introuvable." };
  // Save the desk's field edits first, so what is published is what is on screen.
  const draft = draftFromForm(form, item.draft);
  if (!draft.official) return { ok: false, error: "Source non officielle : joignez le communiqué (ou cochez « source officielle jointe ») avant de publier." };
  if (item.state === "en_revue" && reviewRequester(item.notes) === desk.name) return { ok: false, error: "Ce brouillon est en revue : c'est au relecteur de publier (ou de le renvoyer), pas à la personne qui a demandé la relecture." };
  if (item.state === "rejete") return { ok: false, error: "Source rejetée : rouvrez-la d'abord (Enregistrer le brouillon)." };
  if (draft.kind === "BTA" && decision.precountRate == null) return { ok: false, error: "Indiquez le taux précompté indicatif." };
  if ((draft.kind === "OTA" || draft.kind === "APE") && decision.pricePct == null) return { ok: false, error: "Indiquez le prix Purpose." };
  // The product type's checklist and required free fields gate publication.
  const type = draft.typeKey ? typeByKey(draft.typeKey) : undefined;
  if (type) {
    const ticked = new Set(form.getAll("check").map(String));
    const left = type.checklist.filter((c) => !ticked.has(c));
    if (left.length) return { ok: false, error: `Liste de contrôle : ${left.join(" · ")}` };
    const req = type.fields.filter((f) => f.required && !draft.extra?.[f.key]);
    if (req.length) return { ok: false, error: `Champs requis par le type ${type.short} : ${req.map((f) => f.label).join(", ")}` };
  }

  try {
    const existing = item.offerId ? await r.getOffer(item.offerId) : undefined;
    // Optimistic locking: the screen was built on a given version of the published line.
    const seen = Number(form.get("version") ?? NaN);
    if (existing && Number.isFinite(seen) && seen !== existing.version) throw new ConflictError("offer", existing.id, seen, existing.version);
    const offer = buildOffer({ ...item, draft }, { ...decision, channels }, existing);
    // Four-eyes: outside the delegated window, an opérateur's publication waits for a responsable.
    const reason = approvalReason(offer, existing, await loadPolicy());
    if (reason && !isResponsable(desk)) {
      const a = await r.createApproval({ kind: "offer_publish", entityId: offer.id, title: offer.title, payload: offer, reason: `${reason} · diffusion ${channels.join(", ") || "Guichet"} · ${decision.segment}`, requestedBy: desk.name });
      await r.updateIntake(itemId, { draft });
      await audit("approval.request", "approval", a.id, { after: { offerId: offer.id, reason }, reason });
      await r.logEvent({ kind: "desk", offerId: existing?.id, html: `<b>${offer.title}</b> : publication proposée par ${desk.name}, en attente d'un responsable : ${reason}` });
      revalidatePath("/desk/a-valider");
      revalidatePath("/desk/approbations");
      return { ok: true, pending: reason };
    }
    await r.upsertOffer(offer, { expectedVersion: existing?.version, by: desk.name, note: existing ? "Republication" : "Publication" });
    await audit("offer.publish", "offer", offer.id, { before: existing, after: offer, reason: reason ?? undefined });
    await r.updateIntake(itemId, { draft, state: "publie", offerId: offer.id, publishedAt: offer.pricedAt });
    const priceTxt = offer.kind === "BTA" ? `taux ${fmtPct(offer.precountRate ?? 0, 2)}` : offer.kind === "RACHAT" ? "au pair" : `prix ${fmtPct(offer.pricePct ?? 0, 0)}`;
    await r.logEvent({
      kind: "desk",
      offerId: offer.id,
      html: `<b>${offer.title}</b> publié par ${desk.name} (v${offer.version}, ${priceTxt}) : diffusion ${channels.length ? channels.join(", ") : "Guichet"} · ${decision.segment}`,
    });
    await notifyOfferPublished(offer, channels, decision.segment);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Publication impossible." };
  }
  revalidatePath("/");
  revalidatePath("/desk");
  revalidatePath("/desk/a-valider");
  return { ok: true };
}

const REVIEW_RE = /^Revue demandée par (.+?) —/;
const reviewRequester = (notes?: string): string | undefined => notes?.match(REVIEW_RE)?.[1];

/** An opérateur asks a colleague to re-read the draft before publication (draft → en revue). */
export async function requestReviewAction(_prev: IntakeResult | null, form: FormData): Promise<IntakeResult> {
  const desk = await requireDesk("/desk/a-valider");
  await loadRegistry();
  const id = String(form.get("itemId") ?? "");
  const note = String(form.get("reviewNote") ?? "").trim();
  const item = await repo().getIntake(id);
  if (!item) return { ok: false, error: "Source introuvable." };
  if (!note) return { ok: false, error: "Dites au relecteur quoi vérifier (une phrase)." };
  try {
    const draft = draftFromForm(form, item.draft);
    const notes = `Revue demandée par ${desk.name} : ${note}`;
    await repo().updateIntake(id, { draft, state: "en_revue", notes });
    await audit("intake.review", "intake", id, { before: { state: item.state }, after: { state: "en_revue" }, reason: note });
    await repo().logEvent({ kind: "desk", html: `<b>${item.title}</b> : relecture demandée par ${desk.name} : ${note}` });
    revalidatePath("/desk/a-valider");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Saisie invalide." };
  }
}

/** The reviewer sends the draft back with what to fix (en revue → à valider). */
export async function sendBackAction(_prev: IntakeResult | null, form: FormData): Promise<IntakeResult> {
  const desk = await requireDesk("/desk/a-valider");
  const id = String(form.get("itemId") ?? "");
  const note = String(form.get("reviewNote") ?? "").trim();
  const item = await repo().getIntake(id);
  if (!item) return { ok: false, error: "Source introuvable." };
  if (!note) return { ok: false, error: "Indiquez ce qui doit être corrigé." };
  await repo().updateIntake(id, { state: "a_valider", notes: `Renvoyé par ${desk.name} : ${note}` });
  await audit("intake.send_back", "intake", id, { before: { state: item.state }, after: { state: "a_valider" }, reason: note });
  await repo().logEvent({ kind: "desk", html: `<b>${item.title}</b> : renvoyé en correction par ${desk.name} : ${note}` });
  revalidatePath("/desk/a-valider");
  return { ok: true };
}

export async function rejectAction(form: FormData): Promise<void> {
  await requireDesk("/desk/a-valider");
  const id = String(form.get("itemId") ?? "");
  const item = await repo().getIntake(id);
  await repo().updateIntake(id, { state: "rejete" });
  await audit("intake.reject", "intake", id, { before: { state: item?.state }, after: { state: "rejete" } });
  revalidatePath("/desk/a-valider");
}
