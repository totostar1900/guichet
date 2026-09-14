import "server-only";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { repo } from "@/lib/data";
import type { DocumentType, GeneratedDocument, Offer } from "@/lib/domain/types";
import { parseDate } from "@/lib/finance";
import { saveSource } from "@/lib/intake/storage";
import { AppelDeFonds, AvisOpere, AvisResultat, Bordereau, Bulletin, OrdreDeCession, type BordereauCtx, type ClientDocCtx } from "./pdf/templates";
import { positionFor } from "./position";
import { DOC_LABEL, DOC_PREFIX, type IntentDocumentType } from "./registry";

/**
 * Turns rows into numbered PDFs on the letterhead, stores the bytes and
 * records the document. Numbers: PC-<PREFIX>-<year>-<seq>, one sequence per prefix.
 */

async function nextNumber(type: DocumentType, now: Date): Promise<string> {
  const prefix = DOC_PREFIX[type];
  const year = now.getFullYear();
  const docs = await repo().listDocuments();
  const seq = docs.filter((d) => d.number.startsWith(`PC-${prefix}-${year}-`)).length + 1;
  return `PC-${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

type PdfElement = ReactElement<DocumentProps>;
const el = (e: ReactElement) => e as PdfElement;
const CLIENT_TEMPLATES: Record<IntentDocumentType, (ctx: ClientDocCtx) => PdfElement> = {
  bulletin: (c) => el(createElement(Bulletin, c)),
  fonds: (c) => el(createElement(AppelDeFonds, c)),
  cession: (c) => el(createElement(OrdreDeCession, c)),
  allocation: (c) => el(createElement(AvisResultat, c)),
  non_allocation: (c) => el(createElement(AvisResultat, { ...c, allocation: 0 })),
  opere: (c) => el(createElement(AvisOpere, c)),
};

export interface GenerateOpts {
  advisor?: string;
  allocation?: number; // 0..1, result documents
}

export async function generateForIntent(type: IntentDocumentType, intentId: string, opts: GenerateOpts = {}): Promise<GeneratedDocument> {
  const r = repo();
  const intents = await r.listIntents();
  const intent = intents.find((i) => i.id === intentId);
  if (!intent) throw new Error("Intention introuvable");
  const offer = await r.getOffer(intent.offerId);
  if (!offer) throw new Error("Offre introuvable");
  const now = new Date();
  const number = await nextNumber(type, now);
  const ctx: ClientDocCtx = { number, intent, offer, position: positionFor(intent, offer), now, advisor: opts.advisor, allocation: opts.allocation ?? 1 };
  const pdf = await renderToBuffer(CLIENT_TEMPLATES[type](ctx));
  return store({ type, number, title: `${DOC_LABEL[type]} — ${intent.clientName} · ${offer.title}`, intentId: intent.id, offerId: offer.id, clientName: intent.clientName, createdBy: opts.advisor }, pdf, now);
}

/** All firm intents on the lines of one auction (same issuer country + deadline). */
export async function auctionLines(country: string, deadlineAt: string): Promise<{ offers: Offer[]; lines: BordereauCtx["lines"] }> {
  const r = repo();
  const [offers, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
  const dl = parseDate(deadlineAt).getTime();
  const lineOffers = offers.filter((o) => o.country === country && parseDate(o.deadlineAt).getTime() === dl && o.kind !== "ACTIONS");
  const lines = lineOffers
    .map((offer) => ({
      offer,
      intents: intents
        .filter((i) => i.offerId === offer.id && (i.type === "ferme" || i.type === "cession") && (i.state === "confirmee" || i.state === "transmise"))
        .map((intent) => ({ intent, position: positionFor(intent, offer) })),
    }))
    .filter((l) => l.intents.length > 0);
  return { offers: lineOffers, lines };
}

export async function generateBordereau(country: string, deadlineAt: string, opts: GenerateOpts = {}): Promise<GeneratedDocument> {
  const { offers, lines } = await auctionLines(country, deadlineAt);
  if (!lines.length) throw new Error("Aucun ordre confirmé sur cette adjudication.");
  const now = new Date();
  const number = await nextNumber("bordereau", now);
  const first = offers[0];
  const ctx: BordereauCtx = { number, country, issuer: first.issuer, deadlineAt, settleOn: first.settleOn, sourceRef: first.documents[0]?.name, lines, now };
  const pdf = await renderToBuffer(el(createElement(Bordereau, ctx)));
  const n = lines.reduce((a, l) => a + l.intents.length, 0);
  return store({ type: "bordereau", number, title: `Bordereau SVT — ${first.issuer} · adjudication du ${deadlineAt.slice(0, 10)} · ${n} ordre${n > 1 ? "s" : ""}`, auctionKey: `${country}|${deadlineAt}`, createdBy: opts.advisor }, pdf, now);
}

async function store(meta: Omit<GeneratedDocument, "id" | "fileKey" | "status" | "createdAt">, pdf: Buffer, now: Date): Promise<GeneratedDocument> {
  const fileKey = `docs/${meta.number}.pdf`;
  await saveSource(fileKey, new Uint8Array(pdf), "application/pdf");
  const doc = await repo().createDocument({ ...meta, fileKey, status: "genere", createdAt: now.toISOString() });
  await repo().logEvent({ kind: "document", intentId: meta.intentId, offerId: meta.offerId, html: `<b>${DOC_LABEL[meta.type]}</b> ${meta.number} généré${meta.clientName ? ` pour ${meta.clientName}` : ""}${meta.createdBy ? ` · par ${meta.createdBy}` : ""}` });
  return doc;
}

/* ---------------- KYC documents ---------------- */
import type { ClientFile } from "@/lib/domain/kyc";
import { Convention, DossierOuverture } from "./pdf/kyc-templates";

/** Blank convention model (read before acceptance). Not stored. */
export async function renderConventionModel(): Promise<Buffer> {
  return renderToBuffer(el(createElement(Convention, { number: "MODÈLE", now: new Date() })));
}

export async function generateKycDocument(type: "convention" | "dossier_svt", file: ClientFile, advisor?: string): Promise<GeneratedDocument> {
  const now = new Date();
  const number = await nextNumber(type, now);
  const element = type === "convention" ? createElement(Convention, { number, file, now }) : createElement(DossierOuverture, { number, file, now });
  const pdf = await renderToBuffer(el(element));
  return store({ type, number, title: `${DOC_LABEL[type]} — ${file.identity.name}`, clientName: file.identity.name, clientFileId: file.id, createdBy: advisor }, pdf, now);
}

/* ---------------- Statements ---------------- */
import { positionsFrom } from "@/lib/positions";
import { AttestationDetention, RelevePosition } from "./pdf/statement-templates";

export async function generateStatement(type: "releve" | "attestation", clientId: string, advisor?: string): Promise<GeneratedDocument> {
  const r = repo();
  const contact = await r.getContact(clientId);
  if (!contact) throw new Error("Client introuvable");
  const [intents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
  const positions = positionsFrom(intents.filter((i) => i.clientId === clientId), offers);
  const now = new Date();
  const number = await nextNumber(type, now);
  const element = type === "releve" ? createElement(RelevePosition, { number, contact, positions, now }) : createElement(AttestationDetention, { number, contact, positions, now });
  const pdf = await renderToBuffer(el(element));
  return store({ type, number, title: `${DOC_LABEL[type]} — ${contact.name} · ${now.toISOString().slice(0, 10)}`, clientName: contact.name, clientId, createdBy: advisor }, pdf, now);
}
