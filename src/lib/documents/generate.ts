import "server-only";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { repo } from "@/lib/data";
import type { DocumentType, GeneratedDocument, Offer } from "@/lib/domain/types";
import { parseDate } from "@/lib/finance";
import { saveSource } from "@/lib/intake/storage";
import { AppelDeFonds, AvisOpere, AvisResultat, Bordereau, Bulletin, OrdreDeCession, type BordereauCtx, type ClientDocCtx } from "./pdf/templates";
import { AppelDeFondsOpcvm, AvisOperationOpcvm, BordereauSgo, BulletinSouscriptionOpcvm, DemandeRachatOpcvm, type FundBordereauCtx } from "./pdf/fund-templates";
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

/** OPCVM orders speak of NAVs and registers, not of auctions. */
const FUND_TEMPLATES: Record<IntentDocumentType, (ctx: ClientDocCtx) => PdfElement> = {
  bulletin: (c) => el(createElement(BulletinSouscriptionOpcvm, c)),
  fonds: (c) => el(createElement(AppelDeFondsOpcvm, c)),
  cession: (c) => el(createElement(DemandeRachatOpcvm, c)),
  allocation: (c) => el(createElement(AvisOperationOpcvm, c)),
  non_allocation: (c) => el(createElement(AvisOperationOpcvm, c)),
  opere: (c) => el(createElement(AvisOperationOpcvm, c)),
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
  const file = intent.clientId ? await r.getClientFileByUser(intent.clientId) : undefined;
  const account = file?.review.custodianAccount;
  const payout = file ? { bank: file.funds.bankName, account: file.funds.bankAccount, holder: file.funds.bankHolder } : undefined;
  const ctx: ClientDocCtx = { number, intent, offer, position: positionFor(intent, offer), now, advisor: opts.advisor, allocation: opts.allocation ?? 1, account, payout };
  const pdf = await renderToBuffer((offer.kind === "FONDS" ? FUND_TEMPLATES : CLIENT_TEMPLATES)[type](ctx));
  return store({ type, number, title: `${DOC_LABEL[type]} — ${intent.clientName} · ${offer.title}`, intentId: intent.id, offerId: offer.id, clientName: intent.clientName, createdBy: opts.advisor }, pdf, now);
}

/** All firm intents on the lines of one auction (same issuer country + deadline). */
export async function auctionLines(country: string, deadlineAt: string): Promise<{ offers: Offer[]; lines: BordereauCtx["lines"] }> {
  const r = repo();
  const [offers, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
  const dl = parseDate(deadlineAt).getTime();
  const lineOffers = offers.filter((o) => o.country === country && parseDate(o.deadlineAt).getTime() === dl && o.kind !== "ACTIONS" && o.kind !== "MARCHE" && o.kind !== "FONDS");
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
  const files = await repo().listClientFiles();
  const accounts = new Map(files.map((f) => [f.userId, f.review.custodianAccount]));
  const now = new Date();
  const number = await nextNumber("bordereau", now);
  const first = offers[0];
  const ctx: BordereauCtx = { number, country, issuer: first.issuer, deadlineAt, settleOn: first.settleOn, sourceRef: first.documents[0]?.name, lines, now, accounts };
  const pdf = await renderToBuffer(el(createElement(Bordereau, ctx)));
  const n = lines.reduce((a, l) => a + l.intents.length, 0);
  return store({ type: "bordereau", number, title: `Bordereau SVT — ${first.issuer} · adjudication du ${deadlineAt.slice(0, 10)} · ${n} ordre${n > 1 ? "s" : ""}`, auctionKey: `${country}|${deadlineAt}`, createdBy: opts.advisor }, pdf, now);
}

/** Confirmed / transmitted OPCVM orders of one manager, grouped for its centralising agent. */
export async function generateFundBordereau(manager: string, opts: GenerateOpts = {}): Promise<GeneratedDocument> {
  const r = repo();
  const [offers, intents, files] = await Promise.all([r.listOffers(), r.listIntents(), r.listClientFiles()]);
  const funds = offers.filter((o) => o.kind === "FONDS" && o.fund && o.fund.manager === manager);
  const lines: FundBordereauCtx["lines"] = funds
    .map((offer) => ({
      offer,
      intents: intents.filter((i) => i.offerId === offer.id && (i.type === "souscription" || i.type === "rachat") && (i.state === "confirmee" || i.state === "transmise")).map((intent) => ({ intent, position: positionFor(intent, offer) })),
    }))
    .filter((l) => l.intents.length > 0);
  if (!lines.length) throw new Error(`Aucun ordre confirmé sur les fonds de ${manager}.`);
  const accounts = new Map(files.map((f) => [f.userId, f.review.custodianAccount]));
  const payouts = new Map(files.map((f) => [f.userId, f.funds.bankAccount ? `${f.funds.bankName ? `${f.funds.bankName} ` : ""}${f.funds.bankAccount}` : undefined]));
  const now = new Date();
  const number = await nextNumber("bordereau", now);
  const pdf = await renderToBuffer(el(createElement(BordereauSgo, { number, manager, now, lines, accounts, payouts })));
  const n = lines.reduce((a, l) => a + l.intents.length, 0);
  return store({ type: "bordereau", number, title: `Bordereau de centralisation — ${manager} · ${n} ordre${n > 1 ? "s" : ""}`, auctionKey: `opcvm|${manager}`, createdBy: opts.advisor }, pdf, now);
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

/* ---------------- Rapport d'activité (COSUMAF) ---------------- */
import { activity, clientRegister, orderJournal, type Period } from "@/lib/reporting";
import { RapportActivite } from "./pdf/report-templates";

/** Periodic activity report, rendered on demand from the same rows as the reporting page (not stored: reproducible). */
export async function renderActivityReport(period: Period): Promise<{ pdf: Buffer; number: string }> {
  const r = repo();
  const [offers, intents, events, files, docs, notifs, bulletins] = await Promise.all([r.listOffers(), r.listIntents(), r.listEvents(5000), r.listClientFiles(), r.listDocuments(), r.listNotifications(5000), r.listBulletins(400)]);
  const now = new Date();
  const number = `PC-RAP-${period.from.replace(/-/g, "")}-${period.to.replace(/-/g, "")}`;
  const ctx = {
    number,
    period,
    now,
    activity: activity(intents, offers, files, docs, notifs, period),
    journal: orderJournal(intents, offers, events, period),
    clients: clientRegister(files),
    positions: positionsFrom(intents, offers),
    bulletins: bulletins.filter((b) => b.sessionDate >= period.from && b.sessionDate <= period.to).map((b) => ({ number: b.number, sessionDate: b.sessionDate, status: b.status })),
  };
  const pdf = await renderToBuffer(el(createElement(RapportActivite, ctx)));
  return { pdf, number };
}

/* ---------------- Rapport sur une société cotée ---------------- */
import { companyByMnemo } from "@/lib/reference";
import { analyse, PERIODS, periodComment, periodFrom, pricePeriod } from "@/lib/companies/analysis";
import { RapportSociete } from "./pdf/company-templates";
import { FicheOffre } from "./pdf/offer-templates";
import { offerReference, offerRisks } from "@/lib/domain/sheet";
import { summarize } from "@/lib/domain/summary";
import { displayStatus, offerFamily, statusLabel } from "@/lib/domain/status";

/** Company report over a chart period — same analysis as the page, rendered on demand. */
export async function renderCompanyReport(mnemo: string, p: string): Promise<{ pdf: Buffer; number: string } | undefined> {
  const c = await companyByMnemo(mnemo);
  if (!c) return undefined;
  const history = (await repo().listQuotes(c.isin, 2000)).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  const quote = history[history.length - 1];
  const a = analyse(c, quote);
  const key = PERIODS.some(([k]) => k === p) ? p : "ytd";
  const slice = history.filter((q) => q.sessionDate >= periodFrom(key));
  const period = pricePeriod(slice);
  const now = new Date();
  const number = `PC-SOC-${c.mnemo}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;
  const pdf = await renderToBuffer(el(createElement(RapportSociete, { number, company: c, analysis: a, quotes: slice, period, periodLabel: PERIODS.find(([k]) => k === key)?.[1] ?? key, periodText: period ? periodComment(period, c) : undefined, now })));
  return { pdf, number };
}

/** Fiche PDF of one Guichet line — the page's content, laid out to be sent. */
export async function renderOfferSheet(id: string): Promise<{ pdf: Buffer; number: string } | undefined> {
  const o = await repo().getOffer(id);
  if (!o) return undefined;
  const now = new Date();
  const st = displayStatus(o, now);
  const sm = summarize(o, now);
  const ref = offerReference(o, now);
  const number = `PC-FICHE-${o.id.toUpperCase().slice(0, 24)}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;
  const pdf = await renderToBuffer(el(createElement(FicheOffre, { number, offer: o, summary: sm, family: offerFamily(o), status: statusLabel(o, st), reference: ref ? { title: ref.title, rows: ref.rows } : undefined, flows: ref?.flows, settleOn: ref?.settleOn, risks: offerRisks(o), now })));
  return { pdf, number };
}
