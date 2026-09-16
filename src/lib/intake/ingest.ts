import "server-only";
import { repo } from "@/lib/data";
import type { IntakeItem, IntakeSource, OfferDraft } from "@/lib/domain/types";
import { emptyDraft, extractionAvailable, extractOffer, type ExtractionInput } from "@/lib/intake/extract";
import { saveSource } from "@/lib/intake/storage";
import { loadRegistry } from "@/lib/reference";

/**
 * One way in for every source — a file or text dropped by the desk, an e-mail
 * forwarded to the intake address, a document sent on WhatsApp by a staff
 * member. The original is kept, the extractor proposes a draft, and the item
 * lands in « À valider » (or « À compléter » when the source is not official).
 */
export const MAX_BYTES = 20 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export interface IngestInput {
  title?: string;
  fromLabel: string;
  hint?: string;
  text?: string;
  file?: { bytes: Uint8Array; mimeType: string; name: string };
  /** Sender the desk trusts (official mailbox, staff phone): the draft starts as official. */
  trusted?: boolean;
  /** Where it came from, for the queue badge; inferred when absent. */
  source?: IntakeSource;
}

export type IngestResult = { ok: true; item: IntakeItem } | { ok: false; error: string };

export async function ingestSource(input: IngestInput): Promise<IngestResult> {
  const text = (input.text ?? "").trim();
  const file = input.file;
  if (!file && !text) return { ok: false, error: "Déposez un fichier (PDF, photo) ou collez le texte du message." };
  await loadRegistry();

  let source: IntakeSource = input.source ?? "texte";
  let fileName: string | undefined;
  let mimeType: string | undefined;
  let extraction: ExtractionInput | undefined;
  const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  if (file) {
    if (file.bytes.byteLength > MAX_BYTES) return { ok: false, error: "Fichier trop lourd (max 20 Mo)." };
    mimeType = file.mimeType || "application/octet-stream";
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    fileName = `${key}.${ext}`;
    await saveSource(fileName, file.bytes, mimeType);
    const b64 = Buffer.from(file.bytes).toString("base64");
    if (mimeType === "application/pdf") {
      if (!input.source) source = "pdf";
      extraction = { kind: "pdf", base64: b64, hint: input.hint };
    } else if ((IMAGE_TYPES as readonly string[]).includes(mimeType)) {
      if (!input.source) source = "photo";
      extraction = { kind: "image", base64: b64, mediaType: mimeType as (typeof IMAGE_TYPES)[number], hint: input.hint };
    } else {
      return { ok: false, error: "Format non pris en charge : PDF, JPEG, PNG ou WebP." };
    }
  } else {
    if (!input.source) source = text.includes("@") || /objet\s*:/i.test(text) ? "mail" : "texte";
    extraction = { kind: "text", text, hint: input.hint };
  }

  let draft: OfferDraft = emptyDraft(Boolean(input.trusted) || source === "pdf" || source === "mail");
  let extractedIn: number | undefined;
  if (extractionAvailable() && extraction) {
    try {
      const r = await extractOffer(extraction);
      draft = r.draft;
      extractedIn = r.seconds;
      if (input.trusted) draft.official = true;
    } catch (e) {
      draft = emptyDraft(Boolean(input.trusted));
      draft.remarks = [`Extraction échouée : ${e instanceof Error ? e.message : "erreur inconnue"}. Renseignez les champs à la main.`];
    }
  }

  const item = await repo().createIntake({
    source,
    title: input.title?.trim() || draft.title || file?.name || "Message reçu",
    fromLabel: input.fromLabel,
    receivedAt: new Date().toISOString(),
    state: draft.official ? "a_valider" : "bloque",
    fileName,
    mimeType,
    rawText: file ? undefined : text,
    draft,
    extractedIn,
  });
  await repo().logEvent({ kind: "system", html: `Nouvelle source : <b>${item.title}</b> (${input.fromLabel})${extractedIn != null ? ` — extraite en ${extractedIn} s` : ""}` });
  return { ok: true, item };
}

/** Sender addresses / phone numbers whose documents start as official (comma-separated domains, addresses or E.164 numbers). */
export function trustedSender(address: string): boolean {
  const list = (process.env.INTAKE_TRUSTED_SENDERS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const a = address.trim().toLowerCase();
  return list.some((t) => a === t || (t.startsWith("@") && a.endsWith(t)) || (t.includes("@") === false && !t.startsWith("+") && a.endsWith(`@${t}`)));
}
