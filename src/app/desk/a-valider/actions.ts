"use server";

import { loadRegistry } from "@/lib/reference";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { kindForEngine, typeByKey } from "@/lib/registry";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { Confidence, IntakeSource, OfferDraft } from "@/lib/domain/types";
import { fmtPct } from "@/lib/format";
import { emptyDraft, extractionAvailable, extractOffer, type ExtractionInput } from "@/lib/intake/extract";
import { buildOffer } from "@/lib/intake/publish";
import { saveSource } from "@/lib/intake/storage";
import { notifyOfferPublished } from "@/lib/notify/dispatch";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_BYTES = 20 * 1024 * 1024;

export type IntakeResult = { ok: true } | { ok: false; error: string };

/* ---------- Nouvelle source : fichier ou texte collé ---------- */

export async function createIntakeAction(_prev: IntakeResult | null, form: FormData): Promise<IntakeResult> {
  await requireDesk("/desk/a-valider");
  const title = String(form.get("title") ?? "").trim();
  const fromLabel = String(form.get("from") ?? "").trim();
  const hint = String(form.get("hint") ?? "").trim() || undefined;
  const text = String(form.get("text") ?? "").trim();
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !text) return { ok: false, error: "Déposez un fichier (PDF, photo) ou collez le texte du message." };

  let source: IntakeSource = "texte";
  let fileName: string | undefined;
  let mimeType: string | undefined;
  let input: ExtractionInput | undefined;
  const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  if (hasFile) {
    if (file.size > MAX_BYTES) return { ok: false, error: "Fichier trop lourd (max 20 Mo)." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    mimeType = file.type || "application/octet-stream";
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    fileName = `${key}.${ext}`;
    await saveSource(fileName, bytes, mimeType);
    const b64 = Buffer.from(bytes).toString("base64");
    if (mimeType === "application/pdf") {
      source = "pdf";
      input = { kind: "pdf", base64: b64, hint };
    } else if ((IMAGE_TYPES as readonly string[]).includes(mimeType)) {
      source = "photo";
      input = { kind: "image", base64: b64, mediaType: mimeType as (typeof IMAGE_TYPES)[number], hint };
    } else {
      return { ok: false, error: "Format non pris en charge : PDF, JPEG, PNG ou WebP." };
    }
  } else {
    source = text.includes("@") || /objet\s*:/i.test(text) ? "mail" : "texte";
    input = { kind: "text", text, hint };
  }

  let draft: OfferDraft = emptyDraft(source === "pdf" || source === "mail");
  let extractedIn: number | undefined;
  if (extractionAvailable() && input) {
    try {
      const r = await extractOffer(input);
      draft = r.draft;
      extractedIn = r.seconds;
    } catch (e) {
      draft = emptyDraft(false);
      draft.remarks = [`Extraction échouée : ${e instanceof Error ? e.message : "erreur inconnue"}. Renseignez les champs à la main.`];
    }
  }

  const item = await repo().createIntake({
    source,
    title: title || draft.title || (hasFile ? file.name : "Message collé"),
    fromLabel: fromLabel || "Déposé par le desk",
    receivedAt: new Date().toISOString(),
    state: draft.official ? "a_valider" : "bloque",
    fileName,
    mimeType,
    rawText: hasFile ? undefined : text,
    draft,
    extractedIn,
  });
  await repo().logEvent({ kind: "system", html: `Nouvelle source déposée : <b>${item.title}</b>${extractedIn != null ? ` — extraite en ${extractedIn} s` : ""}` });
  revalidatePath("/desk/a-valider");
  redirect(`/desk/a-valider?item=${item.id}`);
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
    await repo().updateIntake(id, { draft, state: draft.official ? (item.state === "bloque" ? "a_valider" : item.state) : "bloque" });
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
    const offer = buildOffer({ ...item, draft }, { ...decision, channels }, existing);
    await r.upsertOffer(offer);
    await r.updateIntake(itemId, { draft, state: "publie", offerId: offer.id, publishedAt: offer.pricedAt });
    const priceTxt = offer.kind === "BTA" ? `taux ${fmtPct(offer.precountRate ?? 0, 2)}` : offer.kind === "RACHAT" ? "au pair" : `prix ${fmtPct(offer.pricePct ?? 0, 0)}`;
    await r.logEvent({
      kind: "desk",
      offerId: offer.id,
      html: `<b>${offer.title}</b> publié par ${desk.name} (v${offer.version}, ${priceTxt}) — diffusion ${channels.length ? channels.join(", ") : "Guichet"} · ${decision.segment}`,
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

export async function rejectAction(form: FormData): Promise<void> {
  await requireDesk("/desk/a-valider");
  const id = String(form.get("itemId") ?? "");
  await repo().updateIntake(id, { state: "rejete" });
  revalidatePath("/desk/a-valider");
}
